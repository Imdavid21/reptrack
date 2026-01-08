import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { goals } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    if (!goals || typeof goals !== "string" || goals.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide your fitness goals" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Generating workout routine for goals:", goals.substring(0, 100) + "...");

    const systemPrompt = `You are an expert strength and conditioning coach with 20+ years of experience creating personalized workout programs.

Your task is to generate a 6-day Push/Pull/Legs workout routine based on the user's goals.

RULES:
- Create exactly 6 workout days (Day 1 through Day 6)
- Use Push/Pull/Legs split, repeated twice (Push A, Pull A, Legs A, Push B, Pull B, Legs B)
- Each day should have 6-8 exercises
- Categories must be: "warmup", "primary", or "accessory"
- Include specific weight suggestions in kg based on experience level
- Target reps should be in format like "4x8-10" or "3x12-15"
- Focus on compound movements for primary exercises
- Include accessory work for balanced development
- Consider any equipment limitations mentioned

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "routineName": "Program Name - 12 Weeks",
  "days": {
    "Day 1": {
      "name": "Push A",
      "focus": "Chest & Shoulders",
      "exercises": [
        {
          "name": "Exercise Name",
          "category": "primary",
          "targetWeight": "50kg",
          "targetReps": "4x8-10",
          "notes": "Optional coaching notes"
        }
      ]
    }
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: goals },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error("Failed to generate workout routine");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      throw new Error("Empty response from AI");
    }

    console.log("Raw AI response:", content.substring(0, 200) + "...");

    // Parse the JSON response - handle potential markdown code blocks
    let routine;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      routine = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Content was:", content);
      throw new Error("Invalid routine format from AI");
    }

    // Validate structure
    if (!routine.routineName || !routine.days) {
      console.error("Invalid routine structure:", Object.keys(routine));
      throw new Error("Invalid routine structure");
    }

    const dayCount = Object.keys(routine.days).length;
    if (dayCount !== 6) {
      console.warn(`Expected 6 days, got ${dayCount}`);
    }

    console.log("Successfully generated routine:", routine.routineName);

    return new Response(JSON.stringify({ routine }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-workout function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
