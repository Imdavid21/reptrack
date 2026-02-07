import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { summary } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      throw new Error("AI service not configured. Please add your OpenAI API key in settings.");
    }

    if (!summary) {
      return new Response(
        JSON.stringify({ error: "No workout summary provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a concise, data-driven strength & conditioning coach. Analyze the workout data and return 3-5 short, actionable insights.

RULES:
- Each insight must be 1 sentence max, direct and specific
- Reference actual numbers from the data (weights, percentages, days)
- Prioritize: regressions > plateaus > imbalances > positive trends
- Categories: "strength", "recovery", "balance", "consistency", "progress"
- Priority 1-5 (5 = most urgent)
- Be brutally honest but constructive
- Never use filler phrases like "Great job!" or "Keep it up!"`;

    const userPrompt = `Analyze this training data and provide coaching insights:

EXERCISE PROGRESS (weight changes):
${summary.exerciseProgress?.length > 0
  ? summary.exerciseProgress.map((e: any) => `- ${e.name}: ${e.startWeight}kg → ${e.currentWeight}kg (${e.change > 0 ? '+' : ''}${e.change.toFixed(1)}kg)`).join('\n')
  : 'No exercise progression data yet.'}

VOLUME SPLIT: Push ${summary.volumeBreakdown?.push || 0}kg / Pull ${summary.volumeBreakdown?.pull || 0}kg / Legs ${summary.volumeBreakdown?.legs || 0}kg
WORKOUTS: ${summary.totalWorkouts || 0} total, ${summary.daysActive || 0} active days
SLEEP: ${summary.avgSleep ? summary.avgSleep.toFixed(1) + 'h avg' : 'Not tracked'}
ENERGY: ${summary.avgEnergy ? summary.avgEnergy.toFixed(1) + '/10 avg' : 'Not tracked'}
PULL-UPS: ${summary.pullupTotal || 0} total`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "provide_coaching_insights",
              description: "Return 3-5 actionable coaching insights based on workout data analysis.",
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
                          enum: ["strength", "recovery", "balance", "consistency", "progress"],
                        },
                        priority: {
                          type: "integer",
                          description: "1-5, higher = more urgent",
                        },
                        text: {
                          type: "string",
                          description: "One concise sentence with specific data references",
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
      console.error("OpenAI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402 || response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid API key. Please check your OpenAI API key in settings." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        text: i.text.slice(0, 200),
        icon: "",
      }))
      .sort((a: any, b: any) => b.priority - a.priority)
      .slice(0, 5);

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
