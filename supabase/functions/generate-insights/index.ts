import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkoutSummary {
  totalWorkouts: number;
  exerciseProgress: { name: string; startWeight: number; currentWeight: number; change: number }[];
  avgSleep: number | null;
  avgEnergy: number | null;
  supplementAdherence: Record<string, number>;
  pullupTotal: number;
  volumeBreakdown: { push: number; pull: number; legs: number };
  daysActive: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { summary } = await req.json() as { summary: WorkoutSummary };

    if (!summary) {
      return new Response(
        JSON.stringify({ error: 'Missing workout summary' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build a prompt with the workout data
    const prompt = buildPrompt(summary);

    // Call Lovable AI (uses built-in API)
    const response = await fetch('https://ai-gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `You are a concise, brutalist-style fitness coach. Provide exactly 3-5 bullet-point insights based on the user's workout data. Be direct, actionable, and motivating. Use short sentences. Focus on:
- Strength progress and plateaus
- Recovery patterns (sleep/energy)
- Training balance (push/pull/legs)
- Consistency and habits
Keep each bullet under 15 words. No fluff.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json();
    const insights = data.choices?.[0]?.message?.content || 'Unable to generate insights.';

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating insights:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate insights', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildPrompt(summary: WorkoutSummary): string {
  const lines: string[] = [
    `Workout data for the last 30 days:`,
    `- Total workouts: ${summary.totalWorkouts}`,
    `- Days active: ${summary.daysActive}`,
  ];

  if (summary.exerciseProgress.length > 0) {
    lines.push(`\nExercise progress:`);
    summary.exerciseProgress.forEach(ex => {
      const changeStr = ex.change >= 0 ? `+${ex.change.toFixed(1)}kg` : `${ex.change.toFixed(1)}kg`;
      lines.push(`- ${ex.name}: ${ex.startWeight}kg → ${ex.currentWeight}kg (${changeStr})`);
    });
  }

  if (summary.avgSleep !== null) {
    lines.push(`\nRecovery:`);
    lines.push(`- Avg sleep: ${summary.avgSleep.toFixed(1)} hours`);
  }
  if (summary.avgEnergy !== null) {
    lines.push(`- Avg energy: ${summary.avgEnergy.toFixed(1)}/10`);
  }

  if (summary.pullupTotal > 0) {
    lines.push(`- Total pull-ups: ${summary.pullupTotal}`);
  }

  const { push, pull, legs } = summary.volumeBreakdown;
  const total = push + pull + legs;
  if (total > 0) {
    lines.push(`\nVolume distribution:`);
    lines.push(`- Push: ${Math.round((push/total)*100)}%`);
    lines.push(`- Pull: ${Math.round((pull/total)*100)}%`);
    lines.push(`- Legs: ${Math.round((legs/total)*100)}%`);
  }

  const adherenceEntries = Object.entries(summary.supplementAdherence).filter(([_, v]) => v > 0);
  if (adherenceEntries.length > 0) {
    lines.push(`\nSupplement adherence:`);
    adherenceEntries.forEach(([name, pct]) => {
      lines.push(`- ${name}: ${pct}%`);
    });
  }

  lines.push(`\nProvide 3-5 actionable coaching insights based on this data.`);
  
  return lines.join('\n');
}
