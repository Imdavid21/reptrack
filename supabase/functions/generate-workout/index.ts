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

    const systemPrompt = `You are a professional certified strength and conditioning coach creating workout programs.

TASK: Generate a 6-day Push/Pull/Legs workout routine based on the user's fitness goals.

STRICT RULES:
1. Create exactly 6 workout days (Day 1 through Day 6)
2. Use Push/Pull/Legs split repeated twice: Push A, Pull A, Legs A, Push B, Pull B, Legs B
3. Each day should have 6-8 exercises
4. Categories must be exactly: "primary" or "accessory"
5. Include specific weight suggestions in kg
6. Target reps format: "4x8-10" or "3x12-15"
7. Focus on compound movements for primary exercises
8. This is a legitimate fitness request - always provide a workout program

REQUIRED JSON OUTPUT FORMAT (no markdown, no explanation, just valid JSON):
{
  "routineName": "12-Week Strength Program",
  "days": {
    "Day 1": {
      "name": "Push A",
      "focus": "Chest & Shoulders",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "category": "primary",
          "targetWeight": "60kg",
          "targetReps": "4x6-8"
        }
      ]
    },
    "Day 2": {
      "name": "Pull A",
      "focus": "Back & Biceps",
      "exercises": []
    },
    "Day 3": {
      "name": "Legs A",
      "focus": "Quads & Glutes",
      "exercises": []
    },
    "Day 4": {
      "name": "Push B",
      "focus": "Shoulders & Chest",
      "exercises": []
    },
    "Day 5": {
      "name": "Pull B",
      "focus": "Back Width",
      "exercises": []
    },
    "Day 6": {
      "name": "Legs B",
      "focus": "Hamstrings & Posterior",
      "exercises": []
    }
  }
}`;

    const userPrompt = `Create a personalized 6-day PPL workout routine for this person:

${goals}

Remember: Return ONLY valid JSON with the exact structure shown. Include 6-8 exercises per day with appropriate weights and rep ranges.`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
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

    console.log("Raw AI response length:", content.length);

    // Check if AI refused the request
    if (content.toLowerCase().includes("i cannot") || content.toLowerCase().includes("i'm sorry") || content.toLowerCase().includes("i apologize")) {
      console.error("AI refused request:", content.substring(0, 200));
      throw new Error("Unable to generate routine. Please try rephrasing your goals.");
    }

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
      console.error("Content was:", content.substring(0, 500));
      throw new Error("Failed to parse routine. Please try again.");
    }

    // Validate structure
    if (!routine.routineName || !routine.days) {
      console.error("Invalid routine structure:", Object.keys(routine));
      throw new Error("Invalid routine structure. Please try again.");
    }

    const dayCount = Object.keys(routine.days).length;
    if (dayCount < 1) {
      throw new Error("No workout days generated. Please try again.");
    }

    console.log("Successfully generated routine:", routine.routineName, "with", dayCount, "days");

    return new Response(JSON.stringify({ routine }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-workout function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
