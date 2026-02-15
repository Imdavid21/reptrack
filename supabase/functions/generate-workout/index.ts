import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      console.error("generate-workout: Auth failed:", authResp.status);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user = await authResp.json();

    const body = await req.json();
    const goals = body.goals;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    // Validate and sanitize inputs
    const VALID_SPLITS = ["ppl6", "ppl5", "upper_lower4", "full_body3", "custom"];
    const VALID_EXPERIENCE = ["beginner", "intermediate", "advanced"];
    const trainingSplit = VALID_SPLITS.includes(body.trainingSplit) ? body.trainingSplit : "ppl6";
    const experienceLevel = VALID_EXPERIENCE.includes(body.experienceLevel) ? body.experienceLevel : "intermediate";

    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!goals || typeof goals !== "string" || goals.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Please provide your fitness goals" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit goals length to prevent token abuse
    if (goals.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Goals description is too long (max 1000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating workout routine for goals:", goals.substring(0, 100) + "...");
    console.log("Split:", trainingSplit);

    // Dynamic system instructions based on split
    let splitInstructions = "";
    if (trainingSplit === "ppl6") {
      splitInstructions = "Create exactly 6 workout days using Push/Pull/Legs split repeated twice (Push A, Pull A, Legs A, ...).";
    } else if (trainingSplit === "upper_lower4") {
      splitInstructions = "Create exactly 4 workout days using Upper/Lower split (Upper A, Lower A, Upper B, Lower B).";
    } else if (trainingSplit === "full_body3") {
      splitInstructions = "Create exactly 3 workout days using Full Body split (Full Body A, Full Body B, Full Body C).";
    } else if (trainingSplit === "ppl5") {
      splitInstructions = "Create exactly 5 workout days using Hybrid PPL (Push, Pull, Legs, Upper, Lower) or similar 5-day variations.";
    } else {
      splitInstructions = "Create a balanced workout routine for the specified days.";
    }

    const systemPrompt = `You are a professional certified strength and conditioning coach.
    
TASK: Generate a ${trainingSplit} workout routine based on the user's goals using a Heavy/Volume DUP structure.

STRICT RULES:
1. ${splitInstructions}
2. Each day should have 5-8 exercises.
3. Categories must be exactly: "primary" or "accessory".
4. Include specific weight suggestions in kg suitable for an ${experienceLevel} lifter.
5. Target reps format example: "4x4-6", "3x12-15", "5x5".
6. Focus on compound movements for primary exercises.
7. Days 1-3 (first cycle) must have "bias": "heavy". Days 4-6 (second cycle) must have "bias": "volume".

HEAVY DAY RULES (bias: "heavy"):
- Primary compounds: 4x4-6 reps, restSeconds: 180, rir: "2-3"
- Accessories: 3x8-10 reps, restSeconds: 120, rir: "1-2"

VOLUME DAY RULES (bias: "volume"):
- Primary compounds: 4x8-10 reps, restSeconds: 120, rir: "1-2"
- Accessories: 3x12-15 reps, restSeconds: 90, rir: "1-2"
- Single-joint isolations (curls, raises, extensions): 3x15-20 reps, restSeconds: 60, rir: "0-1"

MUSCLE COVERAGE RULES:
- For Push days: Ensure exercises collectively target upper chest (incline), mid chest (flat), front delts (pressing), side delts (lateral raises), and triceps (pushdowns/extensions). If there are two Push days (A & B), vary the emphasis — e.g., Push A = chest-heavy, Push B = shoulder-heavy — but both must include at least one exercise for each sub-group across the pair.
- For Pull days: Cover upper back/lats (vertical pulls like pulldowns/pull-ups), mid back/rhomboids (horizontal rows), rear delts (face pulls/reverse fly), biceps (curls with varied grip — supinated, neutral/hammer), and forearms. If two Pull days, alternate between back thickness (rows/deadlifts) and back width (pulldowns/pull-ups) emphasis.
- For Legs days: Include quad-dominant (squats, leg press, extensions), hamstring-dominant (RDLs, leg curls), glutes (hip thrusts, lunges), and calves. If two Legs days, alternate squat-pattern vs hinge-pattern as the primary movement.
- For Upper days: Balance push and pull movements. Include at least one horizontal push, one vertical push, one horizontal pull, one vertical pull, plus isolation for side delts and arms.
- For Full Body days: Each session must include a squat pattern, a hinge pattern, an upper push, and an upper pull. Vary the specific exercises across days.

VARIATION RULE: When creating paired days (A & B), use different exercises for the same muscle group. For example, if Push A has Barbell Bench Press, Push B should use Dumbbell Press or Incline Press as the primary chest movement. Do NOT repeat the same exercise across paired days.

REQUIRED JSON OUTPUT FORMAT (valid JSON only):
{
  "routineName": "Custom Program Name",
  "days": {
    "Day 1": {
      "name": "Day Name (e.g. Push A)",
      "focus": "Muscle Focus",
      "bias": "heavy",
      "exercises": [
        {
          "name": "Exercise Name",
          "category": "primary",
          "targetWeight": "60kg",
          "targetReps": "4x4-6",
          "restSeconds": 180,
          "rir": "2-3"
        }
      ]
    }
    // ... other days
  }
}`;

    const userPrompt = `Create a personalized ${trainingSplit} workout routine for an ${experienceLevel} lifter with these goals:
${goals}

Return ONLY valid JSON.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid API key. Please check your OpenAI API key in settings." }),
          {
            status: 401,
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
