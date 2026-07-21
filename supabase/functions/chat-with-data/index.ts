import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;
const MAX_LIST_ITEMS = 100;

function clip(s: unknown, n: number): string {
  return typeof s === "string" ? s.slice(0, n) : "";
}

function capList<T>(arr: unknown, n = MAX_LIST_ITEMS): T[] {
  return Array.isArray(arr) ? (arr.slice(0, n) as T[]) : [];
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
      console.error("chat-with-data: Auth failed:", authResp.status);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Per-user rate limit (cost protection). Chat is naturally more back-and-forth
    // than a single "generate insights" call, so this allows more per minute than
    // ai-coach's 10, but still bounded.
    if (!(await checkRateLimit({ supabaseUrl, anonKey: supabaseAnonKey, authHeader, bucket: "chat-with-data", max: 20, windowSeconds: 60 }))) {
      return rateLimitResponse(corsHeaders);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("chat-with-data: OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const rawMessages = Array.isArray(body?.messages) ? body.messages : null;
    const context = body?.context && typeof body.context === "object" ? body.context : null;

    if (!rawMessages || rawMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!context) {
      return new Response(
        JSON.stringify({ error: "No data context provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only trust role + content off each message; clip length and cap history depth.
    const history = rawMessages
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m: any) => ({ role: m.role, content: clip(m.content, MAX_MESSAGE_CHARS) }));

    if (history.length === 0 || history[history.length - 1].role !== "user") {
      return new Response(
        JSON.stringify({ error: "Last message must be from the user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Defense in depth: even though the client already bounds these, don't trust
    // a modified client to keep list sizes (and therefore cost / prompt size) sane.
    const safeContext = {
      lookbackDays: context.lookbackDays ?? null,
      profile: context.profile ?? null,
      bodyScore: context.bodyScore ?? null,
      personalRecords: capList(context.personalRecords),
      muscleBalance: capList(context.muscleBalance, 20),
      plateaus: capList(context.plateaus, 20),
      recentWorkouts: capList(context.recentWorkouts, 20),
      totalWorkoutsLoggedAllTime: context.totalWorkoutsLoggedAllTime ?? null,
      nutrition: capList(context.nutrition, 30),
      hydration: capList(context.hydration, 30),
      bodyweightTrend: capList(context.bodyweightTrend, 30),
      sleepTrend: capList(context.sleepTrend, 30),
      totalPullupsInWindow: context.totalPullupsInWindow ?? null,
      burnHistory: capList(context.burnHistory, 30),
      manualActivities: capList(context.manualActivities, 30),
    };

    const systemPrompt = `You are a knowledgeable, direct fitness and nutrition coach chatting with a user who has full logging history in this app. You have been given their complete recent data context as JSON below — training (workouts, sets, PRs, muscle balance, plateaus), nutrition, hydration, sleep, bodyweight, and manual activity.

RULES:
- Answer using the data provided. Reference actual numbers (weights, dates, calories, percentages) when relevant.
- Be direct and conversational, not a wall of bullet points, unless the question calls for a list.
- If the data can't answer the question (e.g. asking about something outside the ${safeContext.lookbackDays ?? 90}-day window, or something never logged), say so plainly instead of guessing or inventing numbers.
- You are not a doctor. For anything medical (pain, injury, illness), suggest they see a professional rather than diagnosing.
- Keep replies focused — a few sentences to a short paragraph, unless they ask for real depth.

USER'S DATA (JSON):
${JSON.stringify(safeContext)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6-terra",
        // This reasoning-effort model family (same one analyze-food uses)
        // rejects a custom `temperature` outright and takes
        // `max_completion_tokens` instead of the legacy `max_tokens` — that
        // budget also covers hidden reasoning tokens spent before any visible
        // reply, so it's sized well above the reply length itself.
        reasoning_effort: "low",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
        ],
        max_completion_tokens: 1200,
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

      throw new Error("Failed to get a reply from the AI service");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || reply.length === 0) {
      console.error("chat-with-data: empty/invalid completion", JSON.stringify(data).slice(0, 300));
      throw new Error("Unexpected AI response format");
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chat-with-data function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get a response. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
