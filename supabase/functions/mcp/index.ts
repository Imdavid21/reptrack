import { Hono } from "npm:hono@4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, mcp-session-id",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Expose-Headers": "mcp-session-id",
  };
}

const corsHeaders = getCorsHeaders();

const sessions = new Map<string, { userId: string; messageEndpoint: string }>();

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function validateApiKey(apiKey: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const keyHash = await sha256Hex(apiKey);

  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !data) return null;

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash);

  return data.user_id;
}

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

// Tool handlers
async function getWorkouts(args: { limit?: number; offset?: number; days?: number }, userId: string) {
  const supabase = createSupabaseClient();
  const limit = Math.min(args.limit || 50, 500);
  const offset = args.offset || 0;
  const days = args.days || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("workouts")
    .select("id, date, day_name, workout_duration_minutes, post_difficulty, post_satisfaction")
    .eq("user_id", userId)
    .gte("date", startDate)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return { workouts: data, pagination: { limit, offset } };
}

async function getWorkoutDetails(args: { workout_id: string }, userId: string) {
  const supabase = createSupabaseClient();
  const [workoutRes, exercisesRes] = await Promise.all([
    supabase
      .from("workouts")
      .select("*")
      .eq("id", args.workout_id)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("exercises")
      .select("name, category, target_weight, target_reps, actual_weight, actual_reps, completed, sort_order")
      .eq("workout_id", args.workout_id)
      .order("sort_order")
  ]);

  if (workoutRes.error) throw new Error("Workout not found");
  return { workout: workoutRes.data, exercises: exercisesRes.data || [] };
}

async function getTodaySummary(userId: string) {
  const supabase = createSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  const [workoutRes, waterRes, mealsRes, metricsRes] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, day_name, workout_duration_minutes")
      .eq("user_id", userId)
      .eq("date", today),
    supabase
      .from("water_logs")
      .select("amount")
      .eq("user_id", userId)
      .gte("timestamp", `${today}T00:00:00`),
    supabase
      .from("meals")
      .select("calories, protein, carbs, fat, food_name")
      .eq("user_id", userId)
      .eq("date", today),
    supabase
      .from("daily_metrics")
      .select("sleep_hours, energy_level, bodyweight")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle()
  ]);

  const totalWater = waterRes.data?.reduce((sum: number, w: any) => sum + (w.amount || 0), 0) || 0;
  const totalCalories = mealsRes.data?.reduce((sum: number, m: any) => sum + (m.calories || 0), 0) || 0;
  const totalProtein = mealsRes.data?.reduce((sum: number, m: any) => sum + (m.protein || 0), 0) || 0;

  return {
    date: today,
    workout: workoutRes.data?.[0] || null,
    water_liters: Math.round(totalWater * 100) / 100,
    nutrition: { calories: totalCalories, protein: totalProtein, meals_logged: mealsRes.data?.length || 0 },
    daily_metrics: metricsRes.data || null
  };
}

async function getNutrition(args: { date?: string; days?: number; limit?: number; offset?: number }, userId: string) {
  const supabase = createSupabaseClient();
  const today = new Date().toISOString().split("T")[0];
  const limit = Math.min(args.limit || 200, 1000);
  const offset = args.offset || 0;

  let query = supabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (args.days) {
    const startDate = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    query = query.gte("date", startDate);
  } else {
    query = query.eq("date", args.date || today);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

  const byDate: Record<string, { date: string; calories: number; protein: number; carbs: number; fat: number; meals: { food_name: string | null; calories: number | null }[] }> = {};
  for (const meal of data || []) {
    if (!byDate[meal.date]) {
      byDate[meal.date] = { date: meal.date, calories: 0, protein: 0, carbs: 0, fat: 0, meals: [] };
    }
    byDate[meal.date].calories += meal.calories || 0;
    byDate[meal.date].protein += meal.protein || 0;
    byDate[meal.date].carbs += meal.carbs || 0;
    byDate[meal.date].fat += meal.fat || 0;
    byDate[meal.date].meals.push({ food_name: meal.food_name, calories: meal.calories });
  }

  return { nutrition: Object.values(byDate), pagination: { limit, offset } };
}

async function getWaterIntake(args: { date?: string; limit?: number; offset?: number }, userId: string) {
  const supabase = createSupabaseClient();
  const today = new Date().toISOString().split("T")[0];
  const date = args.date || today;
  const limit = Math.min(args.limit || 500, 2000);
  const offset = args.offset || 0;

  const { data, error } = await supabase
    .from("water_logs")
    .select("amount, timestamp")
    .eq("user_id", userId)
    .gte("timestamp", `${date}T00:00:00`)
    .lt("timestamp", `${date}T23:59:59`)
    .order("timestamp")
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const total = data?.reduce((sum: number, w: any) => sum + (w.amount || 0), 0) || 0;
  return { date, total_liters: Math.round(total * 100) / 100, logs: data, pagination: { limit, offset } };
}

async function getSleepEnergy(args: { days?: number }, userId: string) {
  const supabase = createSupabaseClient();
  const days = args.days || 7;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, sleep_hours, energy_level")
    .eq("user_id", userId)
    .gte("date", startDate)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  const avgSleep = data?.length ? data.reduce((sum: number, d: any) => sum + (d.sleep_hours || 0), 0) / data.length : 0;
  const avgEnergy = data?.length ? data.reduce((sum: number, d: any) => sum + (d.energy_level || 0), 0) / data.length : 0;

  return {
    days: data,
    averages: { sleep_hours: Math.round(avgSleep * 10) / 10, energy_level: Math.round(avgEnergy * 10) / 10 }
  };
}

async function getBodyweight(args: { days?: number }, userId: string) {
  const supabase = createSupabaseClient();
  const days = args.days || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, bodyweight")
    .eq("user_id", userId)
    .gte("date", startDate)
    .not("bodyweight", "is", null)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  const current = data?.[0]?.bodyweight;
  const oldest = data?.[data.length - 1]?.bodyweight;
  const change = current && oldest ? Math.round((current - oldest) * 100) / 100 : null;

  return { measurements: data, current_weight: current, change_kg: change, period_days: days };
}

async function getDailyMetrics(args: { days?: number; limit?: number; offset?: number }, userId: string) {
  const supabase = createSupabaseClient();
  const days = args.days || 60;
  const limit = Math.min(args.limit || 180, 500);
  const offset = args.offset || 0;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, pullups, bodyweight, sleep_hours, energy_level, is_rest_day, notes")
    .eq("user_id", userId)
    .gte("date", startDate)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return { period_days: days, metrics: data || [], pagination: { limit, offset } };
}

async function getRecovery(args: { days?: number; limit?: number; offset?: number }, userId: string) {
  const supabase = createSupabaseClient();
  const days = args.days || 60;
  const limit = Math.min(args.limit || 180, 500);
  const offset = args.offset || 0;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("recovery_metrics")
    .select("date, recovery_score, hrv_ms, resting_hr, sleep_quality, fatigue_level, stress_level, workout_readiness, deload_recommended, notes")
    .eq("user_id", userId)
    .gte("date", startDate)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return { period_days: days, recovery: data || [], pagination: { limit, offset } };
}

async function getPersonalRecords(args: { exercise_name?: string }, userId: string) {
  const supabase = createSupabaseClient();

  // First get user's workout IDs, then query exercises (no !inner join)
  const { data: workoutIds, error: wErr } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId);

  if (wErr) throw new Error(wErr.message);
  const ids = (workoutIds || []).map((w: any) => w.id);
  if (ids.length === 0) return { personal_records: [] };

  let query = supabase
    .from("exercises")
    .select("name, actual_weight, actual_reps, workout_id")
    .in("workout_id", ids)
    .eq("completed", true)
    .not("actual_weight", "is", null)
    .not("actual_reps", "is", null);

  if (args.exercise_name) {
    query = query.ilike("name", `%${args.exercise_name}%`);
  }

  const { data, error } = await query.limit(2000);
  if (error) throw new Error(error.message);

  const prs: Record<string, { exercise: string; weight: number; reps: number; e1rm: number }> = {};

  for (const exercise of data || []) {
    const weightMatch = exercise.actual_weight?.match(/[\d.]+/);
    const repsMatch = exercise.actual_reps?.match(/\d+/);
    if (!weightMatch || !repsMatch) continue;

    const weight = parseFloat(weightMatch[0]);
    const reps = parseInt(repsMatch[0]);
    if (weight <= 0 || reps <= 0) continue;

    const e1rm = reps === 1 ? weight : Math.round(weight * (1 + reps / 30));

    if (!prs[exercise.name] || e1rm > prs[exercise.name].e1rm) {
      prs[exercise.name] = { exercise: exercise.name, weight, reps, e1rm };
    }
  }

  return { personal_records: Object.values(prs).sort((a, b) => b.e1rm - a.e1rm) };
}

async function getStatsSummary(userId: string) {
  const supabase = createSupabaseClient();
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [workoutsRes, mealsRes, waterRes, dailyMetricsRes] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, date, workout_duration_minutes")
      .eq("user_id", userId)
      .gte("date", thirtyDaysAgo),
    supabase
      .from("meals")
      .select("calories, protein, date")
      .eq("user_id", userId)
      .eq("date", today),
    supabase
      .from("water_logs")
      .select("amount")
      .eq("user_id", userId)
      .gte("timestamp", `${today}T00:00:00`),
    supabase
      .from("daily_metrics")
      .select("sleep_hours, energy_level, bodyweight")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle()
  ]);

  const totalWorkouts = workoutsRes.data?.length || 0;
  const totalGymMinutes = workoutsRes.data?.reduce((sum: number, w: any) => sum + (w.workout_duration_minutes || 0), 0) || 0;
  const todayCalories = mealsRes.data?.reduce((sum: number, m: any) => sum + (m.calories || 0), 0) || 0;
  const todayProtein = mealsRes.data?.reduce((sum: number, m: any) => sum + (m.protein || 0), 0) || 0;
  const todayWater = waterRes.data?.reduce((sum: number, w: any) => sum + (w.amount || 0), 0) || 0;

  return {
    period: "last_30_days",
    today: {
      date: today,
      calories: todayCalories,
      protein: todayProtein,
      water_liters: todayWater,
      sleep_hours: dailyMetricsRes.data?.sleep_hours || null,
      energy_level: dailyMetricsRes.data?.energy_level || null,
      bodyweight: dailyMetricsRes.data?.bodyweight || null,
    },
    last_30_days: {
      total_workouts: totalWorkouts,
      total_gym_minutes: totalGymMinutes,
      avg_workouts_per_week: Math.round((totalWorkouts / 4.3) * 10) / 10,
    }
  };
}

// Tool definitions
const tools = [
  {
    name: "get_workouts",
    description: "Get a list of workouts with date, duration, difficulty, and satisfaction ratings. Supports pagination.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 50, max 500)" },
        offset: { type: "number", description: "Skip N results for pagination (default 0)" },
        days: { type: "number", description: "Get workouts from the last N days (default 30)" }
      }
    }
  },
  {
    name: "get_workout_details",
    description: "Get detailed information about a specific workout including all exercise sets.",
    inputSchema: {
      type: "object",
      properties: {
        workout_id: { type: "string", description: "The UUID of the workout" }
      },
      required: ["workout_id"]
    }
  },
  {
    name: "get_today_summary",
    description: "Get a summary of today's health metrics: water intake, calories, sleep, energy, and workout status.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_nutrition",
    description: "Get nutrition data (meals and macros) for a date range. Supports pagination.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Specific date YYYY-MM-DD (defaults to today)" },
        days: { type: "number", description: "Get meals from the last N days instead of a specific date" },
        limit: { type: "number", description: "Max results (default 200, max 1000)" },
        offset: { type: "number", description: "Skip N results for pagination (default 0)" }
      }
    }
  },
  {
    name: "get_water_intake",
    description: "Get water intake logs for today or a specific date. Supports pagination.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Specific date YYYY-MM-DD (defaults to today)" },
        limit: { type: "number", description: "Max results (default 500, max 2000)" },
        offset: { type: "number", description: "Skip N results for pagination (default 0)" }
      }
    }
  },
  {
    name: "get_sleep_energy",
    description: "Get sleep hours and energy levels from daily check-ins.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of days to look back (default 7)" }
      }
    }
  },
  {
    name: "get_bodyweight",
    description: "Get bodyweight measurements over time.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of days to look back (default 30)" }
      }
    }
  },
  {
    name: "get_daily_metrics",
    description: "Get daily health metrics (sleep, energy, bodyweight, pullups, rest days). Supports pagination.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of days to look back (default 60)" },
        limit: { type: "number", description: "Max results (default 180, max 500)" },
        offset: { type: "number", description: "Skip N results for pagination (default 0)" }
      }
    }
  },
  {
    name: "get_recovery",
    description: "Get recovery metrics including HRV, resting HR, fatigue, and stress levels. Supports pagination.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of days to look back (default 60)" },
        limit: { type: "number", description: "Max results (default 180, max 500)" },
        offset: { type: "number", description: "Skip N results for pagination (default 0)" }
      }
    }
  },
  {
    name: "get_personal_records",
    description: "Get personal records (PRs) for exercises based on estimated 1RM.",
    inputSchema: {
      type: "object",
      properties: {
        exercise_name: { type: "string", description: "Optional: filter by exercise name" }
      }
    }
  },
  {
    name: "get_stats_summary",
    description: "Get aggregated 30-day stats: total workouts, gym minutes, today's calories/protein/water/sleep/energy/bodyweight.",
    inputSchema: { type: "object", properties: {} }
  }
];

// Handle tool calls
async function handleToolCall(name: string, args: Record<string, unknown>, userId: string) {
  switch (name) {
    case "get_workouts":
      return await getWorkouts(args as any, userId);
    case "get_workout_details":
      return await getWorkoutDetails(args as { workout_id: string }, userId);
    case "get_today_summary":
      return await getTodaySummary(userId);
    case "get_nutrition":
      return await getNutrition(args as any, userId);
    case "get_water_intake":
      return await getWaterIntake(args as any, userId);
    case "get_sleep_energy":
      return await getSleepEnergy(args as { days?: number }, userId);
    case "get_bodyweight":
      return await getBodyweight(args as { days?: number }, userId);
    case "get_daily_metrics":
      return await getDailyMetrics(args as any, userId);
    case "get_recovery":
      return await getRecovery(args as any, userId);
    case "get_personal_records":
      return await getPersonalRecords(args as { exercise_name?: string }, userId);
    case "get_stats_summary":
      return await getStatsSummary(userId);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Process JSON-RPC request
async function handleJsonRpc(body: { method: string; params?: Record<string, unknown>; id?: number | string }, userId: string) {
  const { method, params, id } = body;
  console.log(`MCP request: method=${method}, id=${id}`);

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "fitness-tracker", version: "1.2.0" }
        },
        id
      };

    case "notifications/initialized":
      return { jsonrpc: "2.0", result: {}, id };

    case "tools/list":
      return { jsonrpc: "2.0", result: { tools }, id };

    case "tools/call":
      try {
        const { name, arguments: args } = params as { name: string; arguments?: Record<string, unknown> };
        const result = await handleToolCall(name, args || {}, userId);
        return {
          jsonrpc: "2.0",
          result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
          id
        };
      } catch (err) {
        return {
          jsonrpc: "2.0",
          error: { code: -32603, message: err instanceof Error ? err.message : "Tool execution failed" },
          id
        };
      }

    default:
      return {
        jsonrpc: "2.0",
        error: { code: -32601, message: `Method not found: ${method}` },
        id
      };
  }
}

const app = new Hono();

app.use("*", async (c, next) => {
  const headers = getCorsHeaders();
  Object.entries(headers).forEach(([key, value]) => { c.header(key, value); });
  await next();
});

app.options("*", (c) => new Response(null, { headers: getCorsHeaders() }));

// SSE endpoint
app.get("/sse", async (c) => {
  const apiKey = c.req.header("x-api-key") || c.req.query("api_key") || c.req.header("authorization")?.replace("Bearer ", "");
  if (!apiKey) return c.json({ error: "Missing API key" }, 401, corsHeaders);

  const userId = await validateApiKey(apiKey);
  if (!userId) return c.json({ error: "Invalid API key" }, 401, corsHeaders);

  const sessionId = crypto.randomUUID();
  const baseUrl = new URL(c.req.url);
  const messageEndpoint = `${baseUrl.protocol}//${baseUrl.host}/mcp/message?sessionId=${sessionId}`;
  sessions.set(sessionId, { userId, messageEndpoint });

  const stream = new ReadableStream({
    start(controller) {
      const endpointEvent = `event: endpoint\ndata: ${messageEndpoint}\n\n`;
      controller.enqueue(new TextEncoder().encode(endpointEvent));
      const interval = setInterval(() => {
        try { controller.enqueue(new TextEncoder().encode(": ping\n\n")); } catch { clearInterval(interval); }
      }, 15000);
      setTimeout(() => {
        clearInterval(interval);
        sessions.delete(sessionId);
        try { controller.close(); } catch { /* Already closed */ }
      }, 290000);
    }
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "mcp-session-id": sessionId }
  });
});

// Message endpoint for SSE transport
app.post("/message", async (c) => {
  const sessionId = c.req.query("sessionId");
  if (!sessionId) return c.json({ error: "Missing sessionId" }, 400, corsHeaders);

  const session = sessions.get(sessionId);
  if (!session) return c.json({ error: "Invalid or expired session" }, 401, corsHeaders);

  try {
    const body = await c.req.json();
    const response = await handleJsonRpc(body, session.userId);
    return c.json(response, 200, corsHeaders);
  } catch (err) {
    console.error("Message error:", err);
    return c.json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }, 400, corsHeaders);
  }
});

// Health check
app.get("/", (c) => {
  return c.json({
    status: "ok",
    server: "fitness-tracker-mcp",
    version: "1.2.0",
    endpoints: { sse: "/mcp/sse", message: "/mcp/message" },
    usage: "npx -y mcp-remote https://kfifgbqkykyvnrirxwze.supabase.co/functions/v1/mcp/sse --header 'X-API-Key:YOUR_KEY'",
  }, 200, corsHeaders);
});

app.get("/*", (c) => {
  if (c.req.path.includes("/sse") || c.req.path.includes("/message")) return c.notFound();
  return c.json({ status: "ok", server: "fitness-tracker-mcp", version: "1.2.0", endpoints: { sse: "/mcp/sse", message: "/mcp/message" } }, 200, corsHeaders);
});

// Streamable HTTP transport
app.post("/*", async (c) => {
  if (c.req.path.includes("/message")) return c.notFound();

  const apiKey = c.req.header("x-api-key") || c.req.header("authorization")?.replace("Bearer ", "");
  if (!apiKey) return c.json({ jsonrpc: "2.0", error: { code: -32600, message: "Missing API key" }, id: null }, 401, corsHeaders);

  const userId = await validateApiKey(apiKey);
  if (!userId) return c.json({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid API key" }, id: null }, 401, corsHeaders);

  try {
    const body = await c.req.json();
    const response = await handleJsonRpc(body, userId);
    return c.json(response, 200, corsHeaders);
  } catch (err) {
    console.error("MCP error:", err);
    return c.json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }, 400, corsHeaders);
  }
});

Deno.serve(app.fetch);
