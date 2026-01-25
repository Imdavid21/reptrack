import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CoachContext {
  exercise: string;
  category: 'Push' | 'Pull' | 'Legs';
  movementPattern: string;
  primaryMuscles: string[];
  formCues: string[];
  // Performance data
  personalRecord?: { weight: number; reps: number };
  lastWorkout?: { weight: number; reps: number; date: string };
  currentSet?: { setNumber: number; targetWeight: number; targetReps: number };
  previousSetsToday?: { weight: number; reps: number; completed: boolean }[];
  // Recovery data
  recoveryScore?: number;
  fatigueLevel?: number;
  muscleSoreness?: number;
  sleepQuality?: number;
  weeklyVolume?: number;
  weeksSinceDeload?: number;
  // User context
  userGoal?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const context: CoachContext = await req.json();
    
    if (!context.exercise) {
      return new Response(
        JSON.stringify({ error: "Exercise is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build detailed context for the AI
    const performanceContext = buildPerformanceContext(context);
    const recoveryContext = buildRecoveryContext(context);
    const formContext = context.formCues?.join('. ') || '';

    const systemPrompt = `You are an elite strength coach giving real-time, in-workout guidance. Your cues are:
- SPECIFIC to the exact exercise being performed
- Based on the athlete's ACTUAL performance data and recovery state
- Actionable in the next 30 seconds
- Never generic ("focus on form") - always specific ("drive through your heels, squeeze glutes at lockout")

Movement pattern expertise:
- Push: Drive through full ROM, maintain shoulder blade retraction, control eccentric
- Pull: Initiate with lats/back, squeeze at contraction, full stretch at bottom
- Hinge: Hip hinge, neutral spine, hamstring tension, glute squeeze at top
- Squat: Brace hard, knees track toes, hit depth, drive up explosively

You adapt based on:
- Recovery state: If fatigued, suggest technique focus over intensity
- Previous sets: If last set was hard, may suggest micro-drop or extend rest
- PR proximity: If close to PR, give confidence cues
- Deload timing: If overdue, suggest backing off`;

    const userPrompt = `Exercise: ${context.exercise}
Movement: ${context.movementPattern} | Muscles: ${context.primaryMuscles?.join(', ')}

${performanceContext}

${recoveryContext}

Form reference: ${formContext}

Give me ONE specific coaching cue for my next set. Be direct and actionable.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "coaching_cue",
              description: "Provide a coaching cue for the current exercise",
              parameters: {
                type: "object",
                properties: {
                  cue: {
                    type: "string",
                    description: "The specific coaching cue (1-2 sentences max)"
                  },
                  cue_type: {
                    type: "string",
                    enum: ["form", "intensity", "recovery", "pr_attempt", "progressive_overload"],
                    description: "Type of cue being given"
                  },
                  intensity_modifier: {
                    type: "string",
                    enum: ["maintain", "push_harder", "back_off", "deload"],
                    description: "Suggested intensity adjustment"
                  },
                  suggested_weight: {
                    type: "number",
                    description: "Suggested weight for next set (optional)"
                  },
                  suggested_reps: {
                    type: "number",
                    description: "Suggested reps for next set (optional)"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence in this recommendation (0-100)"
                  }
                },
                required: ["cue", "cue_type", "intensity_modifier"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "coaching_cue" } }
      }),
    });

    if (!response.ok) {
      // Rate limited or error - return sensible fallback
      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify(getFallbackCue(context)),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to generate coaching cue");
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

    // Fallback
    return new Response(
      JSON.stringify(getFallbackCue(context)),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("smart-coach error:", error);
    return new Response(
      JSON.stringify({ 
        cue: "Focus on controlled form through full range of motion", 
        cue_type: "form",
        intensity_modifier: "maintain"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildPerformanceContext(ctx: CoachContext): string {
  const parts: string[] = [];
  
  if (ctx.personalRecord) {
    parts.push(`PR: ${ctx.personalRecord.weight}kg × ${ctx.personalRecord.reps}`);
  }
  
  if (ctx.lastWorkout) {
    parts.push(`Last session: ${ctx.lastWorkout.weight}kg × ${ctx.lastWorkout.reps} (${ctx.lastWorkout.date})`);
  }
  
  if (ctx.currentSet) {
    parts.push(`Current: Set ${ctx.currentSet.setNumber}, Target ${ctx.currentSet.targetWeight}kg × ${ctx.currentSet.targetReps}`);
  }
  
  if (ctx.previousSetsToday?.length) {
    const completed = ctx.previousSetsToday.filter(s => s.completed);
    parts.push(`Today's sets: ${completed.map(s => `${s.weight}kg×${s.reps}`).join(', ')}`);
  }
  
  return parts.length > 0 ? `PERFORMANCE:\n${parts.join('\n')}` : '';
}

function buildRecoveryContext(ctx: CoachContext): string {
  const parts: string[] = [];
  
  if (ctx.recoveryScore !== undefined) {
    parts.push(`Recovery score: ${ctx.recoveryScore}/100`);
  }
  
  if (ctx.fatigueLevel !== undefined) {
    parts.push(`Fatigue: ${ctx.fatigueLevel}/10`);
  }
  
  if (ctx.sleepQuality !== undefined) {
    parts.push(`Sleep quality: ${ctx.sleepQuality}/10`);
  }
  
  if (ctx.weeksSinceDeload !== undefined && ctx.weeksSinceDeload >= 4) {
    parts.push(`⚠️ ${ctx.weeksSinceDeload} weeks since last deload`);
  }
  
  return parts.length > 0 ? `RECOVERY:\n${parts.join('\n')}` : '';
}

function getFallbackCue(ctx: CoachContext): object {
  // Provide intelligent fallback based on context
  const fallbacks: Record<string, { cue: string; cue_type: string }> = {
    push: { 
      cue: "Retract shoulder blades, control the eccentric, explode up", 
      cue_type: "form" 
    },
    pull: { 
      cue: "Initiate with your lats - think 'elbows to hips', squeeze at contraction", 
      cue_type: "form" 
    },
    hinge: { 
      cue: "Push hips back, feel the hamstring stretch, drive through heels", 
      cue_type: "form" 
    },
    squat: { 
      cue: "Brace core hard, knees track over toes, drive the floor away", 
      cue_type: "form" 
    },
    isolation: { 
      cue: "Control the negative, squeeze hard at contraction, full ROM", 
      cue_type: "form" 
    },
  };
  
  const pattern = ctx.movementPattern?.toLowerCase() || 'push';
  const base = fallbacks[pattern] || fallbacks.push;
  
  return {
    ...base,
    intensity_modifier: ctx.recoveryScore && ctx.recoveryScore < 50 ? "back_off" : "maintain"
  };
}
