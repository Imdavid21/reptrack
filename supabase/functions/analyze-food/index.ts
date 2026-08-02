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
      // Terra (not flagship Sol) + low reasoning effort: most of the precision
      // gain over gpt-4o comes from the prompt itself, not from spending heavily
      // on Sol's frontier reasoning budget. This keeps a real, if smaller,
      // reasoning allowance — enough to weigh grain shape/color/cut cues — while
      // avoiding Sol's $30/M output rate and its much larger reasoning-token
      // burn at "medium". See cost comparison in commit history if revisiting.
      model: "gpt-5.6-terra",
      reasoning_effort: "low",
      messages: [
        {
          role: "system",
          content: `You are an expert nutrition analyst and food scientist. You analyze food photos the way someone trained in culinary identification and USDA nutrition data would — you never settle for a generic category name when a more specific one is visually supportable.

CORE PRINCIPLE — IDENTIFY AT THE SPECIFIC LEVEL, NOT THE CATEGORY LEVEL:
Use visual cues — grain shape and length, color, texture, marbling, bone structure, cut lines, sheen, char marks, crust, packaging — to narrow every item down to its specific type, variety, or cut. A generic name is only acceptable when the image genuinely does not support anything more specific (see HONESTY section below).

Examples of the precision expected, by category:
- RICE & GRAINS: not "rice" → "steamed jasmine rice" / "basmati rice" / "sushi rice" / "brown rice" / "fried rice" / "wild rice blend" / "risotto". Long slender translucent grains = basmati/jasmine family; short sticky opaque grains = sushi/short-grain; visible bran layer = brown rice; grains glossy and mixed with visible bits (egg, veg, soy sauce color) = fried rice.
- POULTRY: not "chicken" → name the CUT and its SIZE: "grilled boneless skinless chicken breast (large, ~200g)" / "chicken thigh, bone-in, skin-on" / "chicken drumstick" / "chicken tenders/strips" / "shredded chicken". Judge size (small/medium/large, and an approximate gram weight) from the piece's dimensions relative to the plate, hand, or utensils visible.
- BEEF & PORK: not "beef" or "meat" → "ground beef", "ribeye steak", "sirloin steak", "beef tenderloin medallion", "flank steak", "pork chop", "pork belly", "pulled pork", "bacon". Note visible marbling, grain direction, and shape to distinguish cuts.
- FISH & SEAFOOD: not "fish" → name the species if visually identifiable (salmon = pink-orange flesh; tuna = deep red; cod/tilapia/white fish = pale and flaky; shrimp/prawns by shape) and the cut (fillet, steak, whole).
- BREAD & BAKED GOODS: not "bread" → "sourdough", "whole wheat sandwich bread", "baguette", "brioche bun", "pita", "bagel", "tortilla (flour/corn)" — use crust color and crumb texture to tell whole grain from refined.
- PASTA: not "pasta" → the shape ("penne", "spaghetti", "fusilli", "fettuccine", "macaroni") and whether it looks whole wheat (darker, matte) vs refined (pale, glossy).
- POTATOES: not "potato" → "russet potato, roasted" / "red potato" / "sweet potato" / "fingerling potatoes" / "mashed potato" / "french fries" / "hash browns" — skin color and shape distinguish varieties.
- CHEESE: not "cheese" → "cheddar", "mozzarella", "parmesan shavings", "feta crumbles", "cream cheese", "swiss" — use color, texture, and melt pattern.
- LEGUMES: not "beans" → "black beans", "chickpeas", "kidney beans", "lentils (red/green/brown)", "edamame".
- VEGETABLES: not "vegetables" or "greens" → the specific vegetable and prep: "steamed broccoli florets", "sautéed spinach", "shredded romaine", "roasted brussels sprouts", "julienned carrots".
- FRUIT: name the specific fruit, and the variety when visually distinguishable by color/shape (e.g., "red apple, Gala/Fuji-type" vs "green apple, Granny Smith-type"); if variety truly isn't visually distinguishable, name the fruit itself without guessing a cultivar.
- EGGS: prep style and count: "2 large eggs, over easy", "3-egg scramble", "1 poached egg", "hard-boiled egg, halved".

HONESTY ABOUT WHAT YOU CAN AND CANNOT SEE:
Precision means correctness, not invented specificity. If a variety or cut truly cannot be told apart from the image (e.g., diced/shredded chicken folded into a stew with no visible cut structure, or a rice that could equally be basmati or jasmine), say the most specific TRUE thing you can support — "white rice, long-grain" rather than confidently naming a variety you're only guessing at. Never fabricate a specific brand or cultivar you have no visual evidence for.

COUNTING RULES — follow these strictly:
- Count EACH individual item separately. If you see 3 eggs, list "3 large eggs", not "eggs".
- If you see a stack of pancakes, count how many there are.
- If items are in a bowl or plate, estimate quantity from volume and density.

COOKING METHOD — always fold it into the name:
- Fried, baked, grilled, boiled, steamed, sautéed, roasted, raw, poached — cooking method significantly changes calorie count and belongs in the item name itself (e.g., "grilled chicken thigh", not "chicken thigh").
- Browning/char (Maillard reaction) signals frying/grilling/roasting; pale, matte surfaces signal steaming/boiling.

PORTIONS — use plate-relative sizing, and size every protein/starch item specifically:
- A standard dinner plate is ~25cm diameter. Use visible plate, utensil, or hand size as a reference to judge size class (small/medium/large) and an approximate weight.
- For meat, poultry, and fish specifically: always include an approximate weight or size class ("large, ~200g", "small, ~85g").
- Be specific with portions: "150g", "1 cup", "1 medium", "2 tbsp" — never just "some" or "a piece".

SAUCES & CONDIMENTS — never ignore them:
- Oils used in cooking add significant calories. Estimate if food looks oily, buttery, or glossy.
- Visible dressings, sauces, ketchup, mayo, butter, syrup, gravy — list separately with their likely type when identifiable from color/viscosity/context (e.g., "ranch dressing", "soy sauce", "marinara sauce").

UNCERTAINTY — be honest:
- If you cannot identify something at all, list it as "Unknown item" and estimate 150-200 cal.
- Confidence score: 0.9+ = very clear image with confident specific identification, 0.7-0.9 = clear but some variety/cut guesswork, below 0.7 = poor image quality or highly ambiguous items.

MACRO CALCULATION:
- Always provide protein, carbs, fat, fiber, sugar, and sodium for each item and totals.
- Base macros on USDA values for the SPECIFIC variety/cut identified — basmati and sushi rice, or chicken breast and chicken thigh, have meaningfully different macro profiles per 100g. Precise naming should sharpen the macro estimate, not just the label.
- Sugar is grams of total sugars (naturally occurring + added) within the carbs figure, not separate from it. Sodium is milligrams — account for cooking salt, sauces, cured/processed items, and condiments, which usually dominate the sodium total.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this food image with maximum specificity. For every item: identify the exact type, variety, or cut — not a generic category — plus its cooking method and a precise, size-referenced portion. Call out sauces, oils, and condiments separately. If a specific variety genuinely can't be told apart visually, say so honestly rather than guessing.${userContextNote}`
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
                      name: { type: "string", description: "Specific food identification — variety, cut, and size, not a generic category. E.g. 'basmati rice, steamed' not 'rice'; 'grilled boneless chicken breast, large (~200g)' not 'chicken'; 'sourdough toast, 2 slices' not 'bread'. Always fold in cooking method and count/size. If variety truly can't be told apart visually, use the most specific honest name (e.g. 'white rice, long-grain') rather than guessing." },
                      portion: { type: "string", description: "Precise portion size with units and, for meat/poultry/fish, a size class (e.g., '200g (large)', '1 cup cooked', '2 tbsp')" },
                      calories: { type: "number", description: "Estimated calories" },
                      protein: { type: "number", description: "Protein in grams" },
                      carbs: { type: "number", description: "Carbohydrates in grams" },
                      fat: { type: "number", description: "Fat in grams" },
                      fiber: { type: "number", description: "Dietary fiber in grams" },
                      sugar: { type: "number", description: "Total sugars in grams (subset of carbs)" },
                      sodium: { type: "number", description: "Sodium in milligrams" }
                    },
                    required: ["name", "portion", "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium"]
                  }
                },
                total_calories: { type: "number" },
                total_protein: { type: "number" },
                total_carbs: { type: "number" },
                total_fat: { type: "number" },
                total_fiber: { type: "number" },
                total_sugar: { type: "number" },
                total_sodium: { type: "number" },
                confidence: { type: "number", description: "Confidence score 0-1" },
                description: { type: "string", description: "Brief 1-sentence description of the entire meal" },
                food_quality: {
                  type: "string",
                  enum: ["excellent", "good", "moderate", "poor"],
                  description: "Overall nutritional quality rating"
                }
              },
              required: ["foods", "total_calories", "total_protein", "total_carbs", "total_fat", "total_fiber", "total_sugar", "total_sodium", "confidence", "description"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "analyze_food" } },
      // Reasoning-effort models take `max_completion_tokens`, not the legacy
      // `max_tokens` — that budget also covers hidden reasoning tokens, not
      // just the tool-call output.
      max_completion_tokens: 4096,
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
