import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOpenAI(imageUrl: string, apiKey: string, attempt: number = 1): Promise<any> {
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
      const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
      return callOpenAI(imageUrl, apiKey, attempt + 1);
    }
    
    throw { status: response.status, message: errorText };
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageUrl } = body;
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid image URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured. Please add your OpenAI API key in settings." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await callOpenAI(imageUrl, OPENAI_API_KEY);
    
    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const result = JSON.parse(toolCall.function.arguments);
        
        // Validate required fields
        if (typeof result.total_calories !== 'number' || !result.description) {
          throw new Error("Missing required fields in AI response");
        }
        
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
    
  } catch (error: any) {
    console.error("analyze-food error:", error);
    
    // Handle specific error types
    if (error.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (error.status === 401) {
      return new Response(
        JSON.stringify({ error: "Invalid API key. Please check your OpenAI API key." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (error.status === 400) {
      return new Response(
        JSON.stringify({ error: "Could not analyze this image. Try a clearer photo or manual entry." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to analyze food. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
