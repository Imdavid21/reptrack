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
    const { exercise, personalRecord, recentSets, userProfile } = await req.json();
    
    if (!exercise) {
      return new Response(
        JSON.stringify({ error: "Exercise name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const context = `
Exercise: ${exercise}
${personalRecord ? `Current PR: ${personalRecord.maxWeight}kg × ${personalRecord.reps} reps` : 'No PR recorded yet'}
${recentSets ? `Recent performance: ${JSON.stringify(recentSets)}` : ''}
${userProfile ? `User: ${userProfile.age}yo, ${userProfile.fitness_goal}, ${userProfile.activity_level} activity` : ''}
`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a strength coach providing real-time workout hints. Keep advice SHORT (1-2 sentences max).

Focus on:
- Progressive overload opportunities
- Form cues for the specific exercise
- When to push harder vs. back off
- Recovery indicators

Be direct and actionable. No fluff.`
          },
          {
            role: "user",
            content: `Give me a quick tip for my next set:\n${context}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "workout_hint",
              description: "Generate a workout hint for the current exercise",
              parameters: {
                type: "object",
                properties: {
                  hint: { 
                    type: "string", 
                    description: "Short, actionable workout tip (1-2 sentences)" 
                  },
                  type: { 
                    type: "string", 
                    enum: ["push", "form", "rest", "pr_attempt"],
                    description: "Type of hint"
                  },
                  suggested_weight: {
                    type: "number",
                    description: "Optional suggested weight for next set"
                  },
                  suggested_reps: {
                    type: "number", 
                    description: "Optional suggested reps for next set"
                  }
                },
                required: ["hint", "type"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "workout_hint" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify({ hint: "Focus on controlled form", type: "form" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to generate hint");
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

    // Fallback hint
    return new Response(
      JSON.stringify({ hint: "Focus on controlled form", type: "form" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("workout-hints error:", error);
    return new Response(
      JSON.stringify({ hint: "Focus on controlled form", type: "form" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
