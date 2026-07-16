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

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class HttpStatusError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "HttpStatusError";
  }
}

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      tool_calls?: Array<{
        function?: {
          arguments?: string;
        };
      }>;
      content?: string;
    };
  }>;
};

async function callOpenAI(imageUrl: string, apiKey: string, context: string | undefined, attempt: number = 1): Promise<OpenAIResponse> {
  console.log(`OpenAI API call attempt ${attempt}/${MAX_RETRIES + 1}`);

  // User-supplied context goes in the USER message (below), never the system
  // prompt — system position is the strongest prompt-injection lever, and it's
  // already length-capped by the caller.
  const userContextNote = context ? `\n\nAdditional context from the user: "${context}"` : '';

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a precise nutrition analysis AI. Your job is to analyze food images and provide highly accurate calorie and macro estimates.

COUNTING RULES — follow these strictly:
- Count EACH individual item separately. If you see 3 eggs, list "3 large eggs", not "eggs".
- If you see a stack of pancakes, count how many there are.
- If items are in a bowl or plate, estimate quantity from volume and density.

COOKING METHOD — always identify it:
- Fried, baked, grilled, boiled, sautéed, raw — cooking method significantly changes calorie count.
- Include the cooking method in the food name (e.g., "fried egg", "grilled chicken breast").

PORTIONS — use plate-relative sizing:
- A standard dinner plate is ~25cm diameter. Use visible plate/utensil size as a reference.
- If no plate is visible, estimate from hand size, packaging, or common serving sizes.
- Be specific with portions: "150g", "1 cup", "1 medium", "2 tbsp" — not just "some" or "a piece".

SAUCES & CONDIMENTS — never ignore them:
- Oils used in cooking add significant calories. Estimate if food looks oily/buttery.
- Visible dressings, sauces, ketchup, mayo, butter, syrup — all must be listed separately.

UNCERTAINTY — be honest:
- If you cannot identify something, list it as "Unknown item" and estimate 150-200 cal.
- Confidence score: 0.9+ = very clear image, 0.7-0.9 = clear but some guesswork, below 0.7 = poor image quality.

MACRO CALCULATION:
- Always provide protein, carbs, fat, and fiber for each item and totals.
- Use standard USDA nutritional values as your baseline.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this food image carefully. Count every individual item, identify cooking methods, and estimate all sauces and condiments. Provide precise portion sizes and accurate calorie/macro estimates.${userContextNote}`
            },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" }
            }
          ]
        }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "analyze_food",
            description: "Analyze food in an image and estimate calories and macros",
            parameters: {
              type: "object",
              properties: {
                foods: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Food item name including cooking method and count (e.g., '3 fried eggs', '2 slices whole wheat toast')" },
                      portion: { type: "string", description: "Estimated portion size with units (e.g., '150g', '1 cup', '2 tbsp')" },
                      calories: { type: "number", description: "Estimated calories" },
                      protein: { type: "number", description: "Protein in grams" },
                      carbs: { type: "number", description: "Carbohydrates in grams" },
                      fat: { type: "number", description: "Fat in grams" },
                      fiber: { type: "number", description: "Dietary fiber in grams" }
                    },
                    required: ["name", "portion", "calories"]
                  }
                },
                total_calories: { type: "number" },
                total_protein: { type: "number" },
                total_carbs: { type: "number" },
                total_fat: { type: "number" },
                total_fiber: { type: "number" },
                confidence: { type: "number", description: "Confidence score 0-1" },
                description: { type: "string", description: "Brief 1-sentence description of the entire meal" },
                food_quality: { 
                  type: "string", 
                  enum: ["excellent", "good", "moderate", "poor"],
                  description: "Overall nutritional quality rating"
                }
              },
              required: ["foods", "total_calories", "confidence", "description"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "analyze_food" } },
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenAI error (attempt ${attempt}):`, response.status, errorText);
    
    // Retry on 5xx errors or rate limits
    if ((response.status >= 500 || response.status === 429) && attempt <= MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * attempt; // Linear backoff
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
      return callOpenAI(imageUrl, apiKey, context, attempt + 1);
    }
    
    throw new HttpStatusError(response.status, errorText);
  }

  return (await response.json()) as OpenAIResponse;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`analyze-food: ${req.method} from origin=${req.headers.get("origin")}`);

  try {
    // Verify JWT auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("analyze-food: Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const token = authHeader.replace("Bearer ", "").replace("bearer ", "");
    
    // Verify user via direct GoTrue call (avoids esm.sh client issues)
    console.log(`analyze-food: Verifying token via ${supabaseUrl}/auth/v1/user`);
    const authResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": supabaseAnonKey,
      },
    });
    
    if (!authResp.ok) {
      const errText = await authResp.text();
      console.error(`analyze-food: Auth verification failed (${authResp.status}):`, errText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const user = await authResp.json();

    console.log(`analyze-food: Authenticated user ${user.id}`);

    // Per-user rate limit (vision calls are the most expensive AI path)
    if (!(await checkRateLimit({ supabaseUrl, anonKey: supabaseAnonKey, authHeader, bucket: "analyze-food", max: 15, windowSeconds: 60 }))) {
      return rateLimitResponse(corsHeaders);
    }

    // Validate request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("analyze-food: Invalid JSON body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageUrl, context } = body;
    // Cap free-text context: bound token/cost abuse and shrink the injection
    // surface. Every other AI function caps its free-text input; this one didn't.
    const safeContext = typeof context === "string" ? context.slice(0, 200) : undefined;
    console.log(`analyze-food: imageUrl=${imageUrl ? imageUrl.substring(0, 80) + "..." : "MISSING"}, context=${safeContext || "none"}`);

    if (!imageUrl) {
      console.error("analyze-food: No imageUrl in request body");
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      console.error("analyze-food: Invalid URL format:", imageUrl);
      return new Response(
        JSON.stringify({ error: "Invalid image URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("analyze-food: OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured. Please ask the admin to add an OpenAI API key." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (OPENAI_API_KEY.length < 20) {
      console.error("analyze-food: OPENAI_API_KEY looks invalid (too short)");
      return new Response(
        JSON.stringify({ error: "AI service key appears invalid. Please update the OpenAI API key." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("analyze-food: Calling OpenAI...");

    const data = await callOpenAI(imageUrl, OPENAI_API_KEY, safeContext);
    console.log("analyze-food: OpenAI response received, extracting result...");

    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const result = JSON.parse(toolCall.function.arguments);
        
        // Validate required fields
        if (typeof result.total_calories !== 'number' || !result.description) {
          console.error("analyze-food: Missing required fields:", JSON.stringify(result).substring(0, 200));
          throw new Error("Missing required fields in AI response");
        }

        console.log(`analyze-food: Success! ${result.total_calories} cal - ${result.description}`);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
        throw new Error("AI returned invalid response format");
      }
    }

    // Fallback: try to parse the content directly
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed.total_calories === 'number') {
          return new Response(
            JSON.stringify(parsed),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        // Content wasn't valid JSON
      }
    }

    console.error("Could not extract valid response from AI:", JSON.stringify(data));
    throw new Error("Could not parse AI response");
    
  } catch (error: unknown) {
    console.error("analyze-food error:", error);
    
    // Handle specific error types
    if (error instanceof HttpStatusError && error.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (error instanceof HttpStatusError && error.status === 401) {
      return new Response(
        JSON.stringify({ error: "Invalid API key. Please check your OpenAI API key." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (error instanceof HttpStatusError && error.status === 400) {
      return new Response(
        JSON.stringify({ error: "Could not analyze this image. Try a clearer photo or manual entry." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Don't leak internal/upstream error text to the client; log it server-side.
    return new Response(
      JSON.stringify({ error: "Failed to analyze food. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
