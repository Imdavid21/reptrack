import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Validate API key and return user_id
async function validateApiKey(apiKey: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("api_key", apiKey)
    .single();

  if (error || !data) return null;

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("api_key", apiKey);

  return data.user_id;
}

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

// MCP tool definitions
const tools = [
  {
    name: "get_workouts",
    description: "Get a list of workouts. Returns workout sessions with date, duration, difficulty, and satisfaction ratings.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max number of workouts to return (default 10)" },
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
    description: "Get nutrition data (meals and macros) for a date range.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Specific date in YYYY-MM-DD format (defaults to today)" },
        days: { type: "number", description: "Get meals from the last N days instead of a specific date" }
      }
    }
  },
  {
    name: "get_water_intake",
    description: "Get water intake logs for today or a date range.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Specific date in YYYY-MM-DD format (defaults to today)" }
      }
    }
  },
  {
    name: "get_sleep_energy",
    description: "Get sleep hours and energy levels from morning check-ins.",
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
    name: "get_weekly_stats",
    description: "Get aggregated weekly statistics for workouts, nutrition, and health metrics.",
    inputSchema: { type: "object", properties: {} }
  }
];

// Tool execution handlers
async function executeTool(toolName: string, args: any, userId: string): Promise<any> {
  const supabase = createSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  switch (toolName) {
    case "get_workouts": {
      const limit = args.limit || 10;
      const days = args.days || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("workouts")
        .select("id, date, day_name, workout_duration_minutes, post_difficulty, post_satisfaction")
        .eq("user_id", userId)
        .gte("date", startDate)
        .order("date", { ascending: false })
        .limit(limit);
      
      if (error) throw new Error(error.message);
      return { workouts: data };
    }

    case "get_workout_details": {
      const [workoutRes, setsRes] = await Promise.all([
        supabase
          .from("workouts")
          .select("*")
          .eq("id", args.workout_id)
          .eq("user_id", userId)
          .single(),
        supabase
          .from("exercise_sets")
          .select("exercise_name, set_number, actual_weight, actual_reps, completed")
          .eq("workout_id", args.workout_id)
          .order("exercise_name")
          .order("set_number")
      ]);
      
      if (workoutRes.error) throw new Error("Workout not found");
      
      const exercises: Record<string, any[]> = {};
      for (const set of setsRes.data || []) {
        if (!exercises[set.exercise_name]) exercises[set.exercise_name] = [];
        exercises[set.exercise_name].push(set);
      }
      
      return { workout: workoutRes.data, exercises };
    }

    case "get_today_summary": {
      const [workoutRes, waterRes, mealsRes, morningRes] = await Promise.all([
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
          .from("morning_checkins")
          .select("sleep_hours, energy_level, bodyweight")
          .eq("user_id", userId)
          .eq("date", today)
          .single()
      ]);

      const totalWater = waterRes.data?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
      const totalCalories = mealsRes.data?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0;
      const totalProtein = mealsRes.data?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;

      return {
        date: today,
        workout: workoutRes.data?.[0] || null,
        water_liters: Math.round(totalWater * 100) / 100,
        nutrition: {
          calories: totalCalories,
          protein: totalProtein,
          meals_logged: mealsRes.data?.length || 0
        },
        morning_checkin: morningRes.data || null
      };
    }

    case "get_nutrition": {
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
      
      const { data, error } = await query.limit(50);
      if (error) throw new Error(error.message);
      
      const byDate: Record<string, any> = {};
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
      
      return { nutrition: Object.values(byDate) };
    }

    case "get_water_intake": {
      const date = args.date || today;
      const { data, error } = await supabase
        .from("water_logs")
        .select("amount, timestamp")
        .eq("user_id", userId)
        .gte("timestamp", `${date}T00:00:00`)
        .lt("timestamp", `${date}T23:59:59`)
        .order("timestamp");
      
      if (error) throw new Error(error.message);
      
      const total = data?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
      return { date, total_liters: Math.round(total * 100) / 100, logs: data };
    }

    case "get_sleep_energy": {
      const days = args.days || 7;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("morning_checkins")
        .select("date, sleep_hours, energy_level")
        .eq("user_id", userId)
        .gte("date", startDate)
        .order("date", { ascending: false });
      
      if (error) throw new Error(error.message);
      
      const avgSleep = data?.length ? data.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / data.length : 0;
      const avgEnergy = data?.length ? data.reduce((sum, d) => sum + (d.energy_level || 0), 0) / data.length : 0;
      
      return {
        days: data,
        averages: {
          sleep_hours: Math.round(avgSleep * 10) / 10,
          energy_level: Math.round(avgEnergy * 10) / 10
        }
      };
    }

    case "get_bodyweight": {
      const days = args.days || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("morning_checkins")
        .select("date, bodyweight")
        .eq("user_id", userId)
        .gte("date", startDate)
        .not("bodyweight", "is", null)
        .order("date", { ascending: false });
      
      if (error) throw new Error(error.message);
      
      const current = data?.[0]?.bodyweight;
      const oldest = data?.[data.length - 1]?.bodyweight;
      const change = current && oldest ? Math.round((current - oldest) * 100) / 100 : null;
      
      return {
        measurements: data,
        current_weight: current,
        change_kg: change,
        period_days: days
      };
    }

    case "get_personal_records": {
      let query = supabase
        .from("exercise_sets")
        .select("exercise_name, actual_weight, actual_reps, created_at, workouts!inner(user_id)")
        .eq("workouts.user_id", userId)
        .eq("completed", true)
        .not("actual_weight", "is", null)
        .not("actual_reps", "is", null);
      
      if (args.exercise_name) {
        query = query.ilike("exercise_name", `%${args.exercise_name}%`);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
      if (error) throw new Error(error.message);
      
      const prs: Record<string, { exercise: string; weight: number; reps: number; e1rm: number; date: string }> = {};
      
      for (const set of data || []) {
        const weight = Number(set.actual_weight);
        const reps = Number(set.actual_reps);
        if (weight <= 0 || reps <= 0) continue;
        
        const e1rm = reps === 1 ? weight : Math.round(weight * (1 + reps / 30));
        
        if (!prs[set.exercise_name] || e1rm > prs[set.exercise_name].e1rm) {
          prs[set.exercise_name] = {
            exercise: set.exercise_name,
            weight,
            reps,
            e1rm,
            date: set.created_at.split("T")[0]
          };
        }
      }
      
      return { personal_records: Object.values(prs).sort((a, b) => b.e1rm - a.e1rm) };
    }

    case "get_weekly_stats": {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
      const [workoutsRes, waterRes, mealsRes, sleepRes] = await Promise.all([
        supabase
          .from("workouts")
          .select("workout_duration_minutes")
          .eq("user_id", userId)
          .gte("date", weekAgo),
        supabase
          .from("water_logs")
          .select("amount, timestamp")
          .eq("user_id", userId)
          .gte("timestamp", `${weekAgo}T00:00:00`),
        supabase
          .from("meals")
          .select("calories, protein")
          .eq("user_id", userId)
          .gte("date", weekAgo),
        supabase
          .from("morning_checkins")
          .select("sleep_hours, energy_level")
          .eq("user_id", userId)
          .gte("date", weekAgo)
      ]);

      const totalWorkouts = workoutsRes.data?.length || 0;
      const totalGymMins = workoutsRes.data?.reduce((sum, w) => sum + (w.workout_duration_minutes || 0), 0) || 0;
      const totalWater = waterRes.data?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
      const avgCalories = mealsRes.data?.length ? mealsRes.data.reduce((sum, m) => sum + (m.calories || 0), 0) / 7 : 0;
      const avgSleep = sleepRes.data?.length ? sleepRes.data.reduce((sum, s) => sum + (s.sleep_hours || 0), 0) / sleepRes.data.length : 0;

      return {
        period: "last_7_days",
        workouts: { count: totalWorkouts, total_minutes: totalGymMins },
        water: { total_liters: Math.round(totalWater * 100) / 100, daily_avg: Math.round(totalWater / 7 * 100) / 100 },
        nutrition: { avg_daily_calories: Math.round(avgCalories) },
        sleep: { avg_hours: Math.round(avgSleep * 10) / 10 }
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Handle GET for health check
    if (req.method === "GET") {
      return new Response(JSON.stringify({
        status: "ok",
        server: "fitness-tracker-mcp",
        version: "1.0.0",
        description: "MCP server for fitness tracker data. Use with Claude Desktop or other MCP clients.",
        usage: "POST JSON-RPC requests with X-API-Key header"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing X-API-Key header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = await validateApiKey(apiKey);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { jsonrpc, id, method, params } = body;

    if (jsonrpc !== "2.0") {
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid JSON-RPC version" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: any;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "fitness-tracker-mcp",
            version: "1.0.0"
          },
          capabilities: {
            tools: {}
          }
        };
        break;

      case "tools/list":
        result = { tools };
        break;

      case "tools/call": {
        const { name, arguments: toolArgs } = params;
        const toolResult = await executeTool(name, toolArgs || {}, userId);
        result = {
          content: [
            {
              type: "text",
              text: JSON.stringify(toolResult, null, 2)
            }
          ]
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("MCP error:", e);
    return new Response(
      JSON.stringify({ 
        jsonrpc: "2.0", 
        id: null, 
        error: { code: -32603, message: e instanceof Error ? e.message : "Internal error" } 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
