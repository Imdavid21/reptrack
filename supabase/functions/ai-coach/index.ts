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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { summary } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!summary || typeof summary !== "object") {
      return new Response(
        JSON.stringify({ error: "No data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit exerciseProgress array size to prevent token abuse
    if (Array.isArray(summary.exerciseProgress) && summary.exerciseProgress.length > 50) {
      summary.exerciseProgress = summary.exerciseProgress.slice(0, 50);
    }

    const systemPrompt = `You are a brutally honest, data-driven strength & conditioning coach. You analyze a user's complete fitness picture – training, nutrition, hydration, sleep, and body composition – and deliver 4-6 specific, actionable insights.

RULES:
- Each insight MUST be 1-2 sentences max, direct and specific
- Reference actual numbers from the data (weights, calories, percentages, days)
- Prioritize: regressions > nutritional gaps > plateaus > imbalances > recovery issues > positive trends
- Categories: "strength", "recovery", "nutrition", "hydration", "balance", "consistency", "progress"
- Priority 1-5 (5 = most urgent)
- Cross-reference data: e.g. if sleep is low AND strength plateaued, connect them
- If calorie data exists, comment on protein/calorie adequacy for their goals
- If water data exists, assess hydration relative to training intensity
- Be brutally honest but constructive. No filler phrases.
- If user profile data is available, tailor advice to their age, weight, goals`;

    // Build a rich context prompt
    const sections: string[] = [];

    // User profile
    if (summary.userProfile) {
      const p = summary.userProfile;
      const profileParts: string[] = [];
      if (p.age) profileParts.push(`Age: ${p.age}`);
      if (p.gender) profileParts.push(`Gender: ${p.gender}`);
      if (p.height_cm) profileParts.push(`Height: ${p.height_cm}cm`);
      if (p.fitness_goal) profileParts.push(`Goal: ${p.fitness_goal}`);
      if (p.daily_calorie_goal) profileParts.push(`Calorie goal: ${p.daily_calorie_goal} kcal`);
      if (p.daily_water_goal) profileParts.push(`Water goal: ${p.daily_water_goal} ml`);
      if (p.weekly_workout_goal) profileParts.push(`Workout goal: ${p.weekly_workout_goal}/week`);
      if (profileParts.length > 0) sections.push(`USER PROFILE:\n${profileParts.join(' | ')}`);
    }

    // Exercise progress
    if (summary.exerciseProgress?.length > 0) {
      sections.push(`EXERCISE PROGRESS (weight changes):\n${
        summary.exerciseProgress.map((e: any) =>
          `- ${e.name}: ${e.startWeight}kg → ${e.currentWeight}kg (${e.change > 0 ? '+' : ''}${e.change.toFixed(1)}kg)`
        ).join('\n')
      }`);
    } else {
      sections.push('EXERCISE PROGRESS: No progression data yet.');
    }

    // Volume
    const vb = summary.volumeBreakdown || {};
    sections.push(`VOLUME SPLIT: Push ${vb.push || 0}kg / Pull ${vb.pull || 0}kg / Legs ${vb.legs || 0}kg`);

    // Workout frequency
    sections.push(`WORKOUTS: ${summary.totalWorkouts || 0} sessions, ${summary.daysActive || 0} active days in period`);

    // Sleep
    sections.push(`SLEEP: ${summary.avgSleep ? summary.avgSleep.toFixed(1) + 'h avg' : 'Not tracked'}`);

    // Nutrition
    if (summary.nutrition) {
      const n = summary.nutrition;
      const nutritionParts: string[] = [];
      if (n.avgCalories) nutritionParts.push(`Avg calories: ${Math.round(n.avgCalories)} kcal`);
      if (n.avgProtein) nutritionParts.push(`Avg protein: ${Math.round(n.avgProtein)}g`);
      if (n.avgCarbs) nutritionParts.push(`Avg carbs: ${Math.round(n.avgCarbs)}g`);
      if (n.avgFat) nutritionParts.push(`Avg fat: ${Math.round(n.avgFat)}g`);
      if (n.daysTracked) nutritionParts.push(`Tracked ${n.daysTracked} days`);
      if (n.calorieGoal) nutritionParts.push(`Goal: ${n.calorieGoal} kcal`);
      sections.push(`NUTRITION:\n${nutritionParts.join(' | ') || 'Not tracked'}`);
    } else {
      sections.push('NUTRITION: Not tracked');
    }

    // Hydration
    if (summary.hydration) {
      const h = summary.hydration;
      sections.push(`HYDRATION: Avg ${Math.round(h.avgIntake || 0)}ml/day, tracked ${h.daysTracked || 0} days${h.waterGoal ? `, goal ${h.waterGoal}ml` : ''}`);
    } else {
      sections.push('HYDRATION: Not tracked');
    }

    // Bodyweight trend
    if (summary.bodyweightTrend) {
      const bw = summary.bodyweightTrend;
      sections.push(`BODYWEIGHT: ${bw.start ? bw.start + 'kg' : '?'} → ${bw.current ? bw.current + 'kg' : '?'} (${bw.change > 0 ? '+' : ''}${bw.change?.toFixed(1) || '0'}kg over period)`);
    }

    const userPrompt = `Analyze this complete fitness profile and provide coaching insights:\n\n${sections.join('\n\n')}`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "provide_coaching_insights",
              description: "Return 4-6 actionable coaching insights based on comprehensive fitness data analysis.",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["strength", "recovery", "nutrition", "hydration", "balance", "consistency", "progress"],
                        },
                        priority: {
                          type: "integer",
                          description: "1-5, higher = more urgent",
                        },
                        text: {
                          type: "string",
                          description: "1-2 concise sentences with specific data references",
                        },
                      },
                      required: ["category", "priority", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_coaching_insights" } },
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("Failed to generate coaching insights");
    }

    const data = await response.json();

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      const content = data.choices?.[0]?.message?.content;
      console.error("No tool call in response, content:", content?.substring(0, 200));
      throw new Error("Unexpected AI response format");
    }

    let insights;
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      insights = parsed.insights;
    } catch (parseError) {
      console.error("Failed to parse tool call arguments:", parseError);
      throw new Error("Failed to parse AI response");
    }

    if (!Array.isArray(insights) || insights.length === 0) {
      throw new Error("No insights generated");
    }

    // Validate and sanitize
    const validInsights = insights
      .filter((i: any) => i.category && i.text && typeof i.priority === "number")
      .map((i: any) => ({
        category: i.category,
        priority: Math.min(Math.max(i.priority, 1), 5),
        text: i.text.slice(0, 250),
        icon: "",
      }))
      .sort((a: any, b: any) => b.priority - a.priority)
      .slice(0, 6);

    console.log("Generated", validInsights.length, "AI coaching insights");

    return new Response(JSON.stringify({ insights: validInsights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-coach function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
