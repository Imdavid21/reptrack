import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Validate API key (by hash) and return user_id
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

// Create authenticated supabase client for user data
function createUserClient(userId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
    
    // Get API key from header
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

    const supabase = createUserClient(userId);

    // Route handling
    let data: any;
    let error: any;

    switch (path) {
      case "":
      case "health":
        return new Response(
          JSON.stringify({ 
            status: "ok", 
            version: "1.2.0",
            endpoints: [
              "GET /workouts",
              "GET /workouts/:id",
              "GET /exercises",
              "GET /meals",
              "GET /water",
              "GET /metrics/daily",
              "GET /metrics/recovery",
              "GET /calories/burned",
              "GET /preferences",
              "GET /stats/summary"
            ]
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "workouts": {
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 500);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        ({ data, error } = await supabase
          .from("workouts")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .range(offset, offset + limit - 1));
        break;
      }

      case "exercises": {
        const workoutId = url.searchParams.get("workout_id");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "500"), 2000);
        const offset = parseInt(url.searchParams.get("offset") || "0");

        if (workoutId) {
          // Verify the workout belongs to the requesting user before returning exercises
          const { data: owned, error: ownerErr } = await supabase
            .from("workouts")
            .select("id")
            .eq("id", workoutId)
            .eq("user_id", userId)
            .maybeSingle();
          if (ownerErr || !owned) {
            return new Response(
              JSON.stringify({ error: "Workout not found" }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          ({ data, error } = await supabase
            .from("exercises")
            .select("id, workout_id, name, category, target_weight, target_reps, actual_weight, actual_reps, completed, sort_order")
            .eq("workout_id", workoutId)
            .order("sort_order", { ascending: true })
            .range(offset, offset + limit - 1));
        } else {
          // All exercises: fetch user's workout IDs first, then query exercises
          const { data: workoutIds, error: wErr } = await supabase
            .from("workouts")
            .select("id")
            .eq("user_id", userId);

          if (wErr) { error = wErr; break; }

          const ids = (workoutIds || []).map((w: any) => w.id);
          if (ids.length === 0) { data = []; break; }

          ({ data, error } = await supabase
            .from("exercises")
            .select("id, workout_id, name, category, target_weight, target_reps, actual_weight, actual_reps, completed, sort_order")
            .in("workout_id", ids)
            .order("sort_order", { ascending: true })
            .range(offset, offset + limit - 1));
        }
        break;
      }

      case "meals": {
        const date = url.searchParams.get("date");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "200"), 1000);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        let query = supabase
          .from("meals")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        
        if (date) {
          query = query.eq("date", date);
        }
        ({ data, error } = await query.range(offset, offset + limit - 1));
        break;
      }

      case "water": {
        const date = url.searchParams.get("date");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "500"), 2000);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        let query = supabase
          .from("water_logs")
          .select("*")
          .eq("user_id", userId)
          .order("timestamp", { ascending: false });
        
        if (date) {
          query = query.gte("timestamp", `${date}T00:00:00`)
            .lt("timestamp", `${date}T23:59:59`);
        }
        ({ data, error } = await query.range(offset, offset + limit - 1));
        break;
      }

      case "metrics/daily": {
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "180"), 500);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        let query = supabase
          .from("daily_metrics")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });
        
        if (startDate) query = query.gte("date", startDate);
        if (endDate) query = query.lte("date", endDate);
        
        ({ data, error } = await query.range(offset, offset + limit - 1));
        break;
      }

      case "metrics/recovery": {
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "180"), 500);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        let query = supabase
          .from("recovery_metrics")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });

        if (startDate) query = query.gte("date", startDate);
        if (endDate) query = query.lte("date", endDate);

        ({ data, error } = await query.range(offset, offset + limit - 1));
        break;
      }

      case "calories/burned": {
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "365"), 1000);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        let query = supabase
          .from("calorie_burns")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false });

        if (startDate) query = query.gte("date", startDate);
        if (endDate) query = query.lte("date", endDate);

        ({ data, error } = await query.range(offset, offset + limit - 1));
        break;
      }

      case "preferences": {
        ({ data, error } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle());
        break;
      }

      case "stats/summary": {
        // Get aggregated stats
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

        data = {
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
        break;
      }

      default:
        // Check if it's a workout ID request
        if (path.startsWith("workouts/")) {
          const workoutId = path.replace("workouts/", "");
          const [workoutRes, exercisesRes] = await Promise.all([
            supabase
              .from("workouts")
              .select("*")
              .eq("id", workoutId)
              .eq("user_id", userId)
              .single(),
            supabase
              .from("exercises")
              .select("id, workout_id, name, category, target_weight, target_reps, actual_weight, actual_reps, completed, sort_order")
              .eq("workout_id", workoutId)
              .order("sort_order")
          ]);

          if (workoutRes.error) {
            return new Response(
              JSON.stringify({ error: "Workout not found" }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          data = { ...workoutRes.data, exercises: exercisesRes.data || [] };
          break;
        }

        return new Response(
          JSON.stringify({ error: "Unknown endpoint", path }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Database error", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("API error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
