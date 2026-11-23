/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "npm:@supabase/supabase-js@2.90.0";
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.30.0/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.30.0/server/webStandardStreamableHttp.js";
import { z } from "npm:zod@3.25.76";
import { APPROVED_TOOLS, MCP_MODE, MCP_VERSION, WRITE_TOOLS, capPayload, isApprovedTool, isWriteTool, typedError, withRetry } from "./core.ts";
import { completePlannedWorkout, createPlannedWorkout, deletePlannedWorkout, deleteRecord, getDaySummary, getWorkoutContext, guardedWrite, undoLastWrite, updatePlannedWorkout } from "./planning.ts";
import { todayIn as todayInZone } from "./writes.ts";
import { executeTool } from "./data.ts";
import { executeWriteTool } from "./writes.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/mcp`;
const RESOURCE_METADATA = `${ENDPOINT}/.well-known/oauth-protected-resource`;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type,accept,mcp-protocol-version,mcp-session-id",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id,www-authenticate",
  "Vary": "Origin",
};

const dateRange = {
  start_date: z.string().describe("Inclusive local calendar date in YYYY-MM-DD format."),
  end_date: z.string().describe("Inclusive local calendar date in YYYY-MM-DD format."),
};
const limit = (_max: number, fallback: number) => z.number().int().min(1).optional().default(fallback);
const outputSchema = z.object({
  start_date: z.string().nullable(), end_date: z.string().nullable(), timezone: z.string(),
  data: z.unknown(), summary: z.unknown(), metadata: z.unknown(),
});

const definitions = {
  get_fitness_profile: { description: "Retrieve the authenticated user's current stored fitness profile, goals, targets, program, timezone, and latest logged bodyweight. Use for baseline context; unstored fields remain null.", schema: {} },
  get_bodyweight_history: { description: "Retrieve bodyweight measurements and calculated change and 7-day moving averages for the authenticated user. Use when evaluating a weight trend over a date range.", schema: { ...dateRange, limit: limit(365,365) } },
  get_workouts: { description: "Retrieve detailed completed workout and exercise logs for the authenticated user. Use for reviewing sessions, loads, repetitions, or workout duration.", schema: { ...dateRange, workout_type:z.string().max(80).optional(), exercise:z.string().max(120).optional(), limit:limit(50,50) } },
  get_exercise_history: { description: "Retrieve history for a named exercise, including logged reps/load, calculable volume, and clearly labelled estimated 1RM. Use for evaluating strength progression.", schema: { exercise:z.string().min(1).max(120), ...dateRange, limit:limit(100,100) } },
  get_training_summary: { description: "Retrieve aggregated resistance-training metrics over a date range. Use for consistency, volume, muscle-group sets, duration, or training frequency.", schema: dateRange },
  get_nutrition: { description: "Retrieve logged meals, daily calories, macros, fibre, water, targets, and averages. Use for factual nutrition-log analysis, not medical interpretation.", schema: { ...dateRange, limit:limit(365,365) } },
  get_sleep: { description: "Retrieve stored sleep duration and summary statistics. Use for sleep consistency or recovery context; unavailable sleep fields are explicitly identified.", schema: dateRange },
  get_activity: { description: "Retrieve stored activity, cardio duration, active calories, and distance. Use for activity analysis; BMR and unavailable metrics are never inferred.", schema: dateRange },
  get_progress_summary: { description: "Retrieve a compact cross-domain progress summary covering bodyweight, nutrition, sleep, activity, and training. Use for efficient high-level comparisons without coaching advice.", schema: dateRange },
  get_live_workout: { description: "Read the workout the user is training right now: current exercise, set index, completed sets, volume, elapsed time, and the full exercise list. Returns live=false when no session is in progress.", schema: {} },
  list_workout_triggers: { description: "List in-session cues previously set for the user. By default only active triggers are returned.", schema: { include_fired: z.boolean().optional().default(false) } },
  get_recent_fitness_data: { description: "Retrieve a compact combined recent fitness dataset for prompts reviewing weight, training, nutrition, sleep, and activity together. Accepts any number of days back from today.", schema: { days:z.number().int().min(1).optional().default(14) } },
  get_advanced_snapshot: { description: "Retrieve Advanced Mode evidence across training, progression, bodyweight, sleep, blocks, experiments, and gym configuration for external ChatGPT coaching.", schema: dateRange },
  get_progression_autopilot: { description: "Retrieve per-exercise progression evidence and deterministic progression states. Use the evidence to decide whether loads or reps should change.", schema: dateRange },
  get_cut_control: { description: "Retrieve observed weight trend, goal runway, and configured deficit context. Nutrition completeness is not assumed; use this as evidence for external coaching.", schema: dateRange },
  get_weak_point_radar: { description: "Retrieve muscle-group set exposure and specialization targets. Set counts are exposure evidence, not a hypertrophy score; ChatGPT should interpret priority.", schema: dateRange },
  get_weekly_coach_review: { description: "Retrieve a compact weekly evidence pack for ChatGPT to generate the coach review: workouts, progression, bodyweight, sleep, and logged nutrition.", schema: dateRange },
  get_goal_runway: { description: "Retrieve goal-weight runway from observed bodyweight direction and rate. ETA is returned only when evidence is directionally aligned.", schema: dateRange },
  get_advanced_config: { description: "Retrieve Advanced Mode state, specialization targets, session-volume preference, gym profiles, training blocks, and experiments.", schema: {} },
  list_coach_events: { description: "Retrieve Advanced Mode coach events generated by RepTrack, including session-quality triggers intended for external ChatGPT review.", schema: { include_consumed: z.boolean().optional().default(false), after_id: z.number().int().positive().optional(), limit: limit(100,50) } },
  get_workout_context: { description: "CALL FIRST when planning a workout. One call returns structured JSON for the date: profile (goal, split, bodyweight kg, targets, equipment used), last 4 weeks of sessions grouped by muscle group with days since each was trained, today's split day and the most overdue day, per-exercise progression (last weight kg, last reps, next target), stalled lifts, weak points (under 8 weekly sets), last 3 days of sleep hours, walking, cycling, running, steps and activity kcal, any live workout in progress, and plans already saved for the date. date is optional (defaults to today).", schema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD. Defaults to today in the user's timezone.") } },
  get_day_summary: { description: "Everything logged on one day: meals with macros, totals against targets (calories kcal, protein/carbs/fat/fiber/sugar g, sodium/caffeine mg), water ml, activities (km, minutes, steps, kcal), workouts done and planned. Entries that look like duplicates carry possible_duplicate_of. Use to verify writes or review a day. date optional.", schema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD. Defaults to today.") } },
  get_physique_checkins: { description: "Retrieve weekly physique check-ins: bodyweight, waist, chest, arm and calf measurements and body fat percentage, with change over the range. Use for body-composition trends.", schema: { ...dateRange, limit: limit(200,100) } },
} as const;

const logDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Local calendar date YYYY-MM-DD. Defaults to today; any past date is allowed, never the future.");
const macros = {
  protein: z.number().min(0).max(500).optional(), carbs: z.number().min(0).max(1500).optional(),
  fat: z.number().min(0).max(500).optional(), fiber: z.number().min(0).max(200).optional(),
  sugar: z.number().min(0).max(800).optional(), sodium: z.number().min(0).max(20000).optional().describe("Milligrams."),
  potassium: z.number().min(0).max(20000).optional().describe("Milligrams."),
  caffeine: z.number().min(0).max(2000).optional().describe("Milligrams."),
};
const exerciseList = z.array(z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["primary","compound","accessory","specialization","core"]).optional(),
  sets: z.array(z.object({ reps: z.number().min(0).max(1000).optional(), weight: z.number().min(0).max(600).optional().describe("Plate weight in kg, excluding the bar.") })).min(1),
})).min(1).max(30);

const physiqueFields = {
  bodyweight: z.number().min(20).max(400).optional().describe("Kilograms."),
  waist_cm: z.number().min(30).max(250).optional(),
  upper_arm_left_cm: z.number().min(10).max(100).optional(),
  upper_arm_right_cm: z.number().min(10).max(100).optional(),
  chest_cm: z.number().min(40).max(250).optional(),
  calf_left_cm: z.number().min(10).max(100).optional(),
  calf_right_cm: z.number().min(10).max(100).optional(),
  body_fat_percentage: z.number().min(2).max(70).optional(),
};

const writeDefinitions = {
  log_meal: { description: "Log food the user ate. Requires food_name and calories (kcal; decimals are rounded on the server). Macros in grams, sodium/potassium/caffeine in mg, all optional. Same food on the same date within 10 minutes returns a NEAR_DUPLICATE warning instead of saving. Returns the saved meal with written=true.", schema: { date: logDate, meal_type: z.enum(["breakfast","lunch","dinner","snack"]).optional(), food_name: z.string().min(1).max(200), calories: z.number().min(0).max(10000), ...macros, notes: z.string().max(500).optional(), client_key: z.string().max(64).optional().describe("Idempotency key. Reusing the same key never creates a second record; the original is returned with written=false."), allow_duplicate: z.boolean().optional().describe("Set true to save even when the same item was logged in the last 10 minutes.") } },
  update_meal: { description: "Correct a previously logged meal by its id. Only the supplied fields change. Never deletes.", schema: { meal_id: z.string().min(1).max(40), date: logDate, meal_type: z.enum(["breakfast","lunch","dinner","snack"]).optional(), food_name: z.string().min(1).max(200).optional(), calories: z.number().min(0).max(10000).optional(), ...macros, notes: z.string().max(500).optional() } },
  log_water: { description: "Log water intake for a day. Provide either litres or milliliters.", schema: { date: logDate, litres: z.number().min(0.05).max(10).optional(), milliliters: z.number().min(50).max(10000).optional(), client_key: z.string().max(64).optional().describe("Idempotency key. Reusing the same key never creates a second record; the original is returned with written=false."), allow_duplicate: z.boolean().optional().describe("Set true to save even when the same item was logged in the last 10 minutes.") } },
  log_workout: { description: "Log a completed resistance training session with its exercises and sets. Calorie burn is calculated with the app's energy model so Insights and History stay consistent.", schema: { date: logDate, workout_name: z.string().min(1).max(80), duration_minutes: z.number().min(1).max(480).optional().default(45), start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("Local start time HH:MM."), week_number: z.number().int().min(1).max(520).optional(), exercises: exerciseList, client_key: z.string().max(64).optional().describe("Idempotency key. Reusing the same key never creates a second record; the original is returned with written=false."), allow_duplicate: z.boolean().optional().describe("Set true to save even when the same item was logged in the last 10 minutes.") } },
  update_workout: { description: "Adjust a logged session's date, name, duration, or replace its exercise list. Recalculates calorie burn. Never deletes the session.", schema: { workout_id: z.string().min(1).max(40), date: logDate, workout_name: z.string().min(1).max(80).optional(), duration_minutes: z.number().min(1).max(480).optional(), exercises: exerciseList.optional() } },
  log_activity: { description: "Log a walk, run or cycle. Requires activity_type and at least one of distance_km or duration_minutes; steps optional. Calories are estimated from pace, MET and bodyweight unless supplied. Returns the saved row plus calculation: pace used (min/km), MET, bodyweight, and whether duration was supplied or assumed.", schema: { date: logDate, activity_type: z.enum(["walking","running","cycling","walk","run","cycle","ride","bike"]).describe("walking, running, or cycling (walk/run/cycle also accepted)."), distance_km: z.number().min(0.1).max(500).optional().describe("Kilometres."), duration_minutes: z.number().min(1).max(1440).optional().describe("Minutes. If omitted, a typical pace is assumed and reported."), calories: z.number().min(0).max(5000).optional().describe("kcal. Omit to let the server estimate from MET."), steps: z.number().int().min(0).max(200000).optional(), client_key: z.string().max(64).optional().describe("Idempotency key. Reusing the same key never creates a second record; the original is returned with written=false."), allow_duplicate: z.boolean().optional().describe("Set true to save even when the same item was logged in the last 10 minutes.") } },
  update_activity: { description: "Correct a logged activity by activity_id (or by date + activity_type). Only supplied fields change; pass null to clear distance_km, duration_minutes or steps. Calories are re-estimated unless given. Returns the saved row, the previous values and the calculation.", schema: { activity_id: z.string().min(1).max(40).optional(), date: logDate, activity_type: z.enum(["walking","running","cycling","walk","run","cycle","ride","bike"]).optional().describe("Needed only when activity_id is omitted."), distance_km: z.number().min(0.1).max(500).nullable().optional().describe("Kilometres. null clears it."), duration_minutes: z.number().min(1).max(1440).nullable().optional().describe("Minutes. null clears it."), calories: z.number().min(0).max(5000).nullable().optional().describe("kcal. Omit or null to re-estimate."), steps: z.number().int().min(0).max(200000).nullable().optional().describe("null clears it.") } },
  set_workout_trigger: { description: "Create an in-session cue that the app shows the user while training. Conditions: exercise_started, weight_at_least, reps_at_least, elapsed_minutes, completed_sets, session_volume.", schema: { condition_type: z.enum(["exercise_started","weight_at_least","reps_at_least","elapsed_minutes","completed_sets","session_volume"]), exercise_name: z.string().max(120).optional().describe("Required for exercise-scoped conditions."), threshold: z.number().min(0).max(100000).optional().describe("Required for every condition except exercise_started."), comparator: z.enum(["gte","lte"]).optional().default("gte"), message: z.string().min(1).max(300).describe("Cue text shown to the user mid-session."), repeat_mode: z.enum(["once","always"]).optional().default("once"), expires_in_hours: z.number().min(1).max(72).optional() } },
  cancel_workout_trigger: { description: "Cancel a previously created in-session cue by its id.", schema: { trigger_id: z.string().min(1).max(40) } },
  send_coach_note: { description: "Push a short note into the live workout screen. Fails when no session is active.", schema: { note: z.string().min(1).max(500) } },
  log_physique_checkin: { description: "Log a physique check-in (measurements in cm, bodyweight in kg, body fat percentage) for a day. Logging twice on the same date updates that day's check-in. At least one measurement is required.", schema: { ...physiqueFields, checkin_date: logDate } },
  update_physique_checkin: { description: "Correct a physique check-in by its id. Only supplied fields change. Without an id it falls back to logging the day's check-in. Never deletes.", schema: { checkin_id: z.string().min(1).max(40).optional(), checkin_date: logDate, ...physiqueFields } },
  create_planned_workout: { description: "Save a custom workout plan for a date so it shows on the user's Today page with a Start button; starting it opens a live workout prefilled with these targets. Requires date (YYYY-MM-DD, up to 60 days ahead), title and exercises[]. Each exercise: name, sets, rep_min, rep_max, target_weight_kg (kg), rest_seconds, notes, order. Call get_workout_context first. Returns the saved plan with its id.", schema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD."), title: z.string().min(1).max(80), duration_minutes: z.number().int().min(5).max(300).optional(), notes: z.string().max(500).optional(), exercises: z.array(z.object({ name: z.string().min(1).max(120), muscle_group: z.string().max(40).optional(), sets: z.number().int().min(1).max(15), rep_min: z.number().int().min(1).max(100), rep_max: z.number().int().min(1).max(100), target_weight_kg: z.number().min(0).max(600).nullable().optional().describe("Plate weight kg excluding the bar; null for bodyweight."), rest_seconds: z.number().int().min(0).max(900).optional(), notes: z.string().max(300).optional(), order: z.number().int().min(1).max(50).optional() })).min(1).max(30), client_key: z.string().max(64).optional().describe("Idempotency key. Reusing the same key never creates a second record; the original is returned with written=false.") } },
  update_planned_workout: { description: "Change a planned workout by id. Put only the fields to change inside fields (date, title, duration_minutes, notes, exercises — exercises replaces the whole list). Completed plans cannot be edited.", schema: { id: z.string().uuid(), fields: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), title: z.string().min(1).max(80).optional(), duration_minutes: z.number().int().min(5).max(300).nullable().optional(), notes: z.string().max(500).nullable().optional(), exercises: z.array(z.object({ name: z.string().min(1).max(120), muscle_group: z.string().max(40).optional(), sets: z.number().int().min(1).max(15), rep_min: z.number().int().min(1).max(100), rep_max: z.number().int().min(1).max(100), target_weight_kg: z.number().min(0).max(600).nullable().optional().describe("Plate weight kg excluding the bar; null for bodyweight."), rest_seconds: z.number().int().min(0).max(900).optional(), notes: z.string().max(300).optional(), order: z.number().int().min(1).max(50).optional() })).min(1).max(30).optional() }), client_key: z.string().max(64).optional().describe("Idempotency key. Reusing the same key never creates a second record; the original is returned with written=false.") } },
  delete_planned_workout: { description: "Remove a planned workout by id. Logged sessions are not affected. Undoable with undo_last_write.", schema: { id: z.string().uuid() } },
  complete_planned_workout: { description: "Log what was actually done for a planned workout and mark it completed. sets_actually_done lists every set: exercise name, reps, weight_kg (plate kg, 0 for bodyweight). Creates the workout in History with calorie burn, and returns per-exercise progression versus the plan with the next target.", schema: { id: z.string().uuid(), sets_actually_done: z.array(z.object({ exercise: z.string().min(1).max(120), reps: z.number().int().min(0).max(1000), weight_kg: z.number().min(0).max(600).optional() })).min(1).max(300), duration_minutes: z.number().int().min(1).max(480).optional(), start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().describe("Local HH:MM."), client_key: z.string().max(64).optional().describe("Idempotency key. Reusing the same key never creates a second record; the original is returned with written=false.") } },
  delete_meal: { description: "Delete one meal by meal_id (from get_day_summary). Undoable with undo_last_write.", schema: { meal_id: z.string().uuid() } },
  delete_activity: { description: "Delete one walk, run or cycle by activity_id. Workout calorie entries are refused; use delete_workout. Undoable.", schema: { activity_id: z.string().uuid() } },
  delete_workout: { description: "Delete one logged workout by workout_id, with its sets and calorie burn. Undoable with undo_last_write, which restores sets and burn.", schema: { workout_id: z.string().uuid() } },
  undo_last_write: { description: "Reverse the most recent assistant write that has not been undone (log, update or delete). Call repeatedly to step back further. Returns which tool and record were reverted.", schema: {} },
} as const;

const EXAMPLES: Record<string, unknown> = {
  get_fitness_profile: {}, get_bodyweight_history: { start_date: "2026-10-01", end_date: "2026-11-23" }, get_workouts: { start_date: "2026-11-01", end_date: "2026-11-23", limit: 10 },
  get_exercise_history: { exercise: "Bench Press", start_date: "2026-08-01", end_date: "2026-11-23" }, get_training_summary: { start_date: "2026-11-01", end_date: "2026-11-23" },
  get_nutrition: { start_date: "2026-11-17", end_date: "2026-11-23" }, get_sleep: { start_date: "2026-11-17", end_date: "2026-11-23" }, get_activity: { start_date: "2026-11-17", end_date: "2026-11-23" },
  get_progress_summary: { start_date: "2026-10-24", end_date: "2026-11-23" }, get_recent_fitness_data: { days: 14 }, get_live_workout: {}, list_workout_triggers: { include_fired: false },
  get_advanced_snapshot: { start_date: "2026-10-24", end_date: "2026-11-23" }, get_progression_autopilot: { start_date: "2026-10-24", end_date: "2026-11-23" }, get_cut_control: { start_date: "2026-10-24", end_date: "2026-11-23" },
  get_weak_point_radar: { start_date: "2026-10-24", end_date: "2026-11-23" }, get_weekly_coach_review: { start_date: "2026-11-17", end_date: "2026-11-23" }, get_goal_runway: { start_date: "2026-09-01", end_date: "2026-11-23" },
  get_advanced_config: {}, list_coach_events: { limit: 20 }, get_physique_checkins: { start_date: "2026-09-01", end_date: "2026-11-23" },
  get_workout_context: { date: "2026-11-23" }, get_day_summary: { date: "2026-11-23" },
  log_meal: { food_name: "Chicken rice bowl", calories: 612.5, protein: 48, carbs: 70, fat: 14, meal_type: "lunch", client_key: "meal-2026-11-23-lunch" },
  update_meal: { meal_id: "3f1c...uuid", calories: 540, protein: 45 }, log_water: { milliliters: 500, client_key: "water-1432" },
  log_workout: { workout_name: "Push A", duration_minutes: 55, start_time: "18:30", exercises: [{ name: "Bench Press", category: "compound", sets: [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }] }], client_key: "push-a-2026-11-23" },
  update_workout: { workout_id: "uuid", duration_minutes: 50 }, log_activity: { activity_type: "walking", distance_km: 4.2, duration_minutes: 48, steps: 5600, client_key: "walk-am-2026-11-23" },
  update_activity: { activity_id: "uuid", duration_minutes: null, distance_km: 5 }, set_workout_trigger: { condition_type: "weight_at_least", exercise_name: "Bench Press", threshold: 70, message: "New top set. Keep the bar path tight." },
  cancel_workout_trigger: { trigger_id: "uuid" }, send_coach_note: { note: "Last set: stop one rep short of failure." },
  log_physique_checkin: { bodyweight: 78.4, waist_cm: 84 }, update_physique_checkin: { checkin_id: "uuid", waist_cm: 83.5 },
  create_planned_workout: { date: "2026-11-23", title: "Pull A (custom)", duration_minutes: 60, exercises: [{ name: "Lat Pulldown", muscle_group: "back", sets: 3, rep_min: 8, rep_max: 12, target_weight_kg: 55, rest_seconds: 90, order: 1 }], client_key: "plan-2026-11-23" },
  update_planned_workout: { id: "uuid", fields: { title: "Pull A heavy", duration_minutes: 70 } }, delete_planned_workout: { id: "uuid" },
  complete_planned_workout: { id: "uuid", sets_actually_done: [{ exercise: "Lat Pulldown", reps: 10, weight_kg: 55 }, { exercise: "Lat Pulldown", reps: 9, weight_kg: 55 }] },
  delete_meal: { meal_id: "uuid" }, delete_activity: { activity_id: "uuid" }, delete_workout: { workout_id: "uuid" }, undo_last_write: {},
};
const describe = (name: string, text: string) => `${text} Units: kg, km, ml, minutes, kcal. Example input: ${JSON.stringify(EXAMPLES[name] ?? {})}`;

function json(body: unknown, status = 200, headers: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type":"application/json", "Cache-Control":"no-store", ...headers } });
}

function todayIn(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
}
function minusDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - days + 1); return d.toISOString().slice(0,10);
}
function validTimezone(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}

async function authenticate(req: Request) {
  const header = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(header)) return null;
  const token = header.replace(/^Bearer\s+/i, "");
  const auth = createClient(SUPABASE_URL, ANON_KEY, { auth:{persistSession:false,autoRefreshToken:false} });
  let data: any = null, error: any = null;
  try {
    ({ data, error } = await withRetry("auth.getUser", async () => {
      const result = await auth.auth.getUser(token);
      if (result.error && (result.error as any).status >= 500) throw result.error;
      return result;
    }, 2));
  } catch (e) { console.error("[mcp] auth check failed:", (e as Error).message); return null; }
  if (error || !data?.user) { console.warn("[mcp] rejected token:", error?.message ?? "no user"); return null; }
  return { user:data.user, token, db:createClient(SUPABASE_URL, ANON_KEY, { global:{headers:{Authorization:`Bearer ${token}`}}, auth:{persistSession:false,autoRefreshToken:false} }) };
}

async function loadUserTimezone(db: any) {
  try {
    const { data, error } = await db.from("user_preferences").select("*").limit(1);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return validTimezone(row?.timezone) ? row.timezone : "Asia/Kolkata";
  } catch (error) {
    console.warn("[mcp] timezone unavailable, using fallback:", (error as Error)?.message ?? error);
    return "Asia/Kolkata";
  }
}

async function audit(userId:string, tool:string, started:number, success:boolean, category:string|null) {
  try { await createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false}}).from("mcp_audit_logs").insert({user_id:userId,tool_name:tool,duration_ms:Math.max(0,Date.now()-started),success,error_category:category}); } catch { /* audit cannot leak or alter tool output */ }
}

function createServer(ctx:{user:{id:string},db:any,timezone?:string}) {
  const server = new McpServer({ name:"fitness-mcp", version:MCP_VERSION }, { capabilities:{tools:{}} });
  const timezone = () => ctx.timezone || "Asia/Kolkata";
  for (const name of WRITE_TOOLS) {
    const def = writeDefinitions[name];
    server.registerTool(name, { title:name.replaceAll("_"," "), description:describe(name, def.description), inputSchema:def.schema as any, annotations:{readOnlyHint:false,destructiveHint:name.startsWith("delete_")||name==="undo_last_write",idempotentHint:"client_key" in (def.schema as any),openWorldHint:false} }, async (raw:any) => {
      if (MCP_MODE !== "read_write" || !isWriteTool(name)) throw new Error("Tool is not permitted");
      const started=Date.now();
      try {
        const tz=timezone(), today=todayInZone(tz), uid=ctx.user.id, db=ctx.db;
        const exec=async():Promise<any>=>{
          switch(name){
            case "create_planned_workout": return await createPlannedWorkout(raw,db,uid,today);
            case "update_planned_workout": return await updatePlannedWorkout(raw,db,uid,today);
            case "delete_planned_workout": return await deletePlannedWorkout(raw,db,uid);
            case "complete_planned_workout": return await completePlannedWorkout(raw,db,uid,today,tz);
            case "delete_meal": case "delete_activity": case "delete_workout": return await deleteRecord(name,raw,db,uid);
            default: return await executeWriteTool(name, raw, db, uid, tz);
          }
        };
        const result:any = name==="undo_last_write" ? {...(await undoLastWrite(db,uid)),written:true} : await guardedWrite(name, raw, db, uid, tz, exec);
        result.timezone = tz;
        await audit(ctx.user.id,name,started,true,null);
        return { content:[{type:"text",text:JSON.stringify(result)}], structuredContent:result };
      } catch(e) { const category=e instanceof Error?e.message:"INTERNAL_ERROR"; console.error(`[mcp] write tool ${name} failed:`,category); await audit(ctx.user.id,name,started,false,category.slice(0,120)); return {isError:true,content:[{type:"text",text:JSON.stringify({written:false,error:typedError(category)})}]}; }
    });
  }
  for (const name of APPROVED_TOOLS) {
    const def = definitions[name];
    server.registerTool(name, { title:name.replaceAll("_"," "), description:describe(name, def.description), inputSchema:def.schema as any, outputSchema, annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false} }, async (raw:any) => {
      if (!isApprovedTool(name)) throw new Error("Tool is not permitted");
      const started=Date.now();
      try {
        let args=raw;
        if(name==="get_recent_fitness_data") { let p:any=null; try { const {data}=await ctx.db.from("user_preferences").select("*").limit(1); p=Array.isArray(data)?data[0]:data; } catch { p=null; } const tz=(p as any)?.timezone||"Asia/Kolkata", end=todayIn(tz); args={start_date:minusDays(end,raw.days??14),end_date:end}; }
        const raw_result= name==="get_workout_context" ? await getWorkoutContext(raw,ctx.db,ctx.user.id,timezone()) : name==="get_day_summary" ? await getDaySummary(raw,ctx.db,ctx.user.id,timezone()) : await executeTool(name,args,ctx.db);
        const { payload:result } = capPayload(raw_result);
        await audit(ctx.user.id,name,started,true,null);
        return { content:[{type:"text",text:JSON.stringify(result)}], structuredContent:result };
      } catch(e) { const category=e instanceof Error?e.message:"INTERNAL_ERROR"; console.error(`[mcp] tool ${name} failed:`,category); await audit(ctx.user.id,name,started,false,category.slice(0,120)); return {isError:true,content:[{type:"text",text:JSON.stringify({error:typedError(category)})}]}; }
    });
  }
  return server;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:CORS});
  const path=new URL(req.url).pathname;
  if (path.endsWith("/health")) return json({status:"ok",service:"fitness-mcp",version:MCP_VERSION,mode:MCP_MODE,transport:"streamable-http"});
  if (path.endsWith("/.well-known/oauth-protected-resource")) return json({resource:ENDPOINT,authorization_servers:[`${SUPABASE_URL}/auth/v1`],bearer_methods_supported:["header"],scopes_supported:["openid","profile"]});
  if (req.method === "POST") {
    const length=Number(req.headers.get("content-length")||0); if(length>131072)return json({error:"Request too large"},413);
    const bytes=new Uint8Array(await req.arrayBuffer()); if(bytes.byteLength>131072)return json({error:"Request too large"},413);
    req=new Request(req.url,{method:req.method,headers:req.headers,body:bytes});
  }
  const ctx=await authenticate(req);
  if(!ctx){ const had=/^Bearer\s+\S+/i.test(req.headers.get("authorization")||""); return json({jsonrpc:"2.0",id:null,error:{code:-32001,message:had?"Your Reptrack session expired. The assistant should refresh its token automatically; if this repeats, reconnect Reptrack in the assistant's connector settings.":"Sign in to Reptrack to use these tools.",data:{code:had?"SESSION_EXPIRED":"AUTH_REQUIRED",hint:"Use the refresh token to get a new access token, or reconnect the Reptrack connector."}}},401,{"WWW-Authenticate":`Bearer resource_metadata="${RESOURCE_METADATA}"${had?', error="invalid_token", error_description="Access token expired or invalid"':""}`}); }
  if(!["POST","GET","DELETE"].includes(req.method))return json({error:"Method not allowed"},405);
  try {
    const timezone=await loadUserTimezone(ctx.db);
    const transport=new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
    const server=createServer({...ctx,timezone}); await server.connect(transport);
    const response=await transport.handleRequest(req);
    const headers=new Headers(response.headers); Object.entries(CORS).forEach(([k,v])=>headers.set(k,v)); headers.set("Cache-Control","no-store");
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  } catch (e) { console.error("[mcp] transport failure:",(e as Error)?.message ?? e); return json({jsonrpc:"2.0",id:null,error:{code:-32603,message:"Reptrack could not process this request. Retry it; writes with the same client_key will not duplicate.",data:{detail:(e as Error)?.message ?? "unknown"}}},500); }
});