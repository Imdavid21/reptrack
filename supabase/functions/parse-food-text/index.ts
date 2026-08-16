import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const token = authHeader.replace("Bearer ", "").replace("bearer ", "");
    
    const authResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { "Authorization": `Bearer ${token}`, "apikey": supabaseAnonKey },
    });
    if (!authResp.ok) {
      console.error("parse-food-text: Auth failed:", authResp.status);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user = await authResp.json();

    if (!(await checkRateLimit({ supabaseUrl, anonKey: supabaseAnonKey, authHeader, bucket: "parse-food-text", max: 20, windowSeconds: 60 }))) {
      return rateLimitResponse(corsHeaders);
    }

    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit input length to prevent token abuse
    if (text.length > 500) {
      return new Response(
        JSON.stringify({ error: "Text description is too long (max 500 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      signal: AbortSignal.timeout(45000),
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a nutrition expert. Parse natural language food descriptions and estimate calories and macros.
            
Examples:
- "2 eggs and toast" → 2 large eggs (~140 cal) + 1 slice toast (~80 cal)
- "chicken salad with dressing" → grilled chicken breast + mixed greens + dressing (~400 cal)
- "large pepperoni pizza slice" → 1 large slice pepperoni pizza (~300 cal)

Be accurate with portions. When quantities aren't specified, assume reasonable single servings.

Always estimate sugar (grams, a subset of carbs) and sodium (milligrams) alongside protein/carbs/fat — sauces, dressings, and processed or cured items usually dominate the sodium total. Also estimate potassium (milligrams) — fruit, vegetables, legumes, dairy and potatoes carry most of it.`
          },
          {
            role: "user",
            content: `Parse this food description and estimate nutrition: "${text}"`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_food",
              description: "Parse food description into structured nutrition data",
              parameters: {
                type: "object",
                properties: {
                  foods: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Food item name" },
                        portion: { type: "string", description: "Estimated portion size" },
                        calories: { type: "number", description: "Estimated calories" },
                        protein: { type: "number", description: "Protein in grams" },
                        carbs: { type: "number", description: "Carbs in grams" },
                        fat: { type: "number", description: "Fat in grams" },
                        fiber: { type: "number", description: "Dietary fiber in grams" },
                        sugar: { type: "number", description: "Total sugars in grams (subset of carbs)" },
                        sodium: { type: "number", description: "Sodium in milligrams" },
                      potassium: { type: "number", description: "Potassium in milligrams" }
                      },
                      // Macros are required: left optional, the model routinely
                      // omitted sugar and sodium, so those never got recorded.
                      required: ["name", "portion", "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium", "potassium"]
                    }
                  },
                  total_calories: { type: "number" },
                  total_protein: { type: "number" },
                  total_carbs: { type: "number" },
                  total_fat: { type: "number" },
                  total_fiber: { type: "number" },
                  total_sugar: { type: "number" },
                  total_sodium: { type: "number" },
                total_potassium: { type: "number" },
                  description: { type: "string", description: "Brief description of the meal" },
                  food_quality: { 
                    type: "string", 
                    enum: ["excellent", "good", "moderate", "poor"],
                    description: "Overall nutritional quality"
                  },
                  confidence: { type: "number", description: "Confidence score 0-1" }
                },
                required: ["foods", "total_calories", "description", "confidence"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_food" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid API key." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Could not parse AI response");
  } catch (error) {
    console.error("parse-food-text error:", error);
    const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    // Generic client message (timeout is safe/actionable to surface); detail is logged above.
    return new Response(
      JSON.stringify({ error: isTimeout ? "AI took too long. Try again or enter manually." : "Failed to parse food. Please try again or enter manually." }),
      { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
