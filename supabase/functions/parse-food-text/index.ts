import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

Be accurate with portions. When quantities aren't specified, assume reasonable single servings.`
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
                        fat: { type: "number", description: "Fat in grams" }
                      },
                      required: ["name", "portion", "calories"]
                    }
                  },
                  total_calories: { type: "number" },
                  total_protein: { type: "number" },
                  total_carbs: { type: "number" },
                  total_fat: { type: "number" },
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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
