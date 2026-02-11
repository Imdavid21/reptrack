import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://reps-and-reminders.lovable.app",
  "https://reptrack.fitness",
  "https://www.reptrack.fitness",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:8080",
];

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/(?:[a-z0-9-]+\.)*reptrack\.fitness(?::\d+)?$/i,
  /^https:\/\/(?:[a-z0-9-]+\.)*lovable\.app(?::\d+)?$/i,
  /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i,
  /^capacitor:\/\/localhost$/i,
  /^ionic:\/\/localhost$/i,
];

function resolveAllowedOrigin(origin: string) {
  // Non-browser callers may omit Origin; allow with wildcard CORS response.
  if (!origin || origin === "null") return "*";

  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))) return origin;

  console.warn(`analyze-food: rejecting origin=${origin}`);
  return ALLOWED_ORIGINS[0];
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = resolveAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
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

async function callOpenAI(imageUrl: string, apiKey: string, attempt: number = 1): Promise<OpenAIResponse> {
  console.log(`OpenAI API call attempt ${attempt}/${MAX_RETRIES + 1}`);
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a nutrition expert AI. Analyze food images and provide accurate calorie estimates.
          
When analyzing food:
1. Identify all visible food items
2. Estimate portion sizes based on visual cues
3. Calculate approximate calories for each item
4. Sum up total calories

Be accurate with portions. When quantities aren't clear, assume reasonable single servings.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this food image and estimate the calories."
            },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "low" }
            }
          ]
        }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "analyze_food",
            description: "Analyze food in an image and estimate calories",
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
                confidence: { type: "number", description: "Confidence score 0-1" },
                description: { type: "string", description: "Brief description of the meal" },
                food_quality: { 
                  type: "string", 
                  enum: ["excellent", "good", "moderate", "poor"],
                  description: "Overall nutritional quality"
                }
              },
              required: ["foods", "total_calories", "confidence", "description"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "analyze_food" } },
      max_tokens: 1000,
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
      return callOpenAI(imageUrl, apiKey, attempt + 1);
    }
    
    throw new HttpStatusError(response.status, errorText);
  }

  return (await response.json()) as OpenAIResponse;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    console.log(`analyze-food: preflight from origin=${req.headers.get("origin")}`);
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("analyze-food: Auth failed:", authError?.message || "no user");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`analyze-food: Authenticated user ${user.id}`);

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

    const { imageUrl } = body;
    console.log(`analyze-food: imageUrl=${imageUrl ? imageUrl.substring(0, 80) + "..." : "MISSING"}`);

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
        JSON.stringify({ error: "AI service not configured. Please add your OpenAI API key in settings." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("analyze-food: Calling OpenAI...");

    const data = await callOpenAI(imageUrl, OPENAI_API_KEY);
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

    const fallbackMessage = error instanceof Error
      ? error.message
      : "Failed to analyze food. Please try again.";
    
    return new Response(
      JSON.stringify({ error: fallbackMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
