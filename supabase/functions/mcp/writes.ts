/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * MCP write tools. Scope is deliberately narrow: meals, water, workouts and
 * activities. There is no delete path, and every row is written for the
 * authenticated user through the user-scoped PostgREST client so RLS applies.
 */
import { assertWritableDate, boundedNumber, categorizeDbError, round, withRetry } from "./core.ts";
import { cancelWorkoutTrigger, sendCoachNote, setWorkoutTrigger } from "./live.ts";
import { ENERGY_MODEL_VERSION, estimateActivityEnergy, estimateWorkoutEnergyMcp, type ActivityKind } from "./energy.ts";

type Client = any;
type Args = Record<string, any>;

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const ACTIVITY_KINDS = ["walking", "running", "cycling"] as const;

export async function write<T>(label: string, build: () => any): Promise<T> {
  return await withRetry(label, async () => {
    const { data, error } = await build();
    if (error) {
      const detail = [(error as any).message, (error as any).details, (error as any).hint].filter(Boolean).join(" | ").slice(0, 200);
      const err = new Error(`${categorizeDbError(error).replace("READ", "WRITE")}${detail ? `: ${detail}` : ""}`);
      (err as any).code = (error as any).code;
      (err as any).status = (error as any).status;
      throw err;
    }
    return data as T;
  });
}

export function todayIn(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function localParts(instant: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(instant).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Convert a wall-clock time in an IANA timezone to a UTC ISO timestamp.
 * The verification step rejects nonexistent DST wall times instead of silently
 * moving the logged session to a different local time. */
function zonedIso(date: string, time: string, timezone: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!dateMatch || !timeMatch) throw new Error("INVALID_LOCAL_TIME");
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);
  if (hour > 23 || minute > 59 || second > 59) throw new Error("INVALID_LOCAL_TIME");

  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const rendered = localParts(new Date(guess), timezone);
    const renderedAsUtc = Date.UTC(rendered.year, rendered.month - 1, rendered.day, rendered.hour, rendered.minute, rendered.second);
    const delta = target - renderedAsUtc;
    if (delta === 0) break;
    guess += delta;
  }
  const verified = localParts(new Date(guess), timezone);
  if (verified.year !== year || verified.month !== month || verified.day !== day || verified.hour !== hour || verified.minute !== minute || verified.second !== second) throw new Error("INVALID_LOCAL_TIME");
  return new Date(guess).toISOString();
}

function localClock(iso: string, timezone: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) throw new Error("INVALID_STORED_TIME");
  const parts = localParts(value, timezone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}`;
}

export async function preferences(db: Client) {
  try {
    const { data } = await db.from("user_preferences").select("*").limit(1);
    return (Array.isArray(data) ? data[0] : data) ?? {};
  } catch { return {}; }
}

/** Bodyweight nearest on/before the log date; falls back to the onboarding weight. */
async function effectiveWeight(db: Client, date: string, prefs: Args): Promise<number> {
  try {
    const { data } = await db.from("daily_metrics").select("date,bodyweight").not("bodyweight", "is", null).lte("date", date).order("date", { ascending: false }).limit(1);
    const w = Number((Array.isArray(data) ? data[0] : data)?.bodyweight);
    if (Number.isFinite(w) && w > 0) return w;
  } catch { /* fall through to preference weight */ }
  const fallback = Number(prefs?.initial_weight_kg);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 75;
}

function requireString(label: string, value: unknown, max = 120): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) throw new Error(`MISSING_${label.toUpperCase()}`);
  return s.slice(0, max);
}

function oneOf<T extends readonly string[]>(label: string, value: unknown, allowed: T, fallback?: T[number]): T[number] {
  const s = String(value ?? "").toLowerCase().trim();
  if (allowed.includes(s as any)) return s as T[number];
  if (fallback) return fallback;
  throw new Error(`INVALID_${label.toUpperCase()}`);
}

const ok = (action: string, record: unknown, extra: Args = {}) =>
  ({ start_date: null, end_date: null, timezone: "", data: record, summary: { action, ...extra }, metadata: { written: true, model_version: ENERGY_MODEL_VERSION } });

/** Deterministic UUID (v4-shaped) derived from an arbitrary idempotency key. */
async function stableUuid(seed: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/* ------------------------------- meals ------------------------------- */

/** Keyword based caffeine estimate (mg) used when the caller omits the field,
 *  so assistant logged coffee/tea/cola entries still land with a real number. */
export function estimateCaffeineMg(foodName: string): number {
  const n = (foodName || "").toLowerCase();
  const has = (re: string) => new RegExp(`\\b(${re})\\b`).test(n);
  let mg = 0;
  if (has("decaf")) mg = 3;
  else if (has("americano|cold brew|filter coffee|drip coffee")) mg = 150;
  else if (has("matcha") && has("latte|cappuccino|mocha|frappe")) mg = 70;
  else if (has("latte|cappuccino|mocha|flat white|frappe|macchiato")) mg = 75;
  else if (has("espresso")) mg = 65;
  else if (has("coffee|nescafe")) mg = 95;
  else if (has("matcha")) mg = 70;
  else if (has("green tea|lemon tea|white tea")) mg = 30;
  else if (has("tea|chai")) mg = 47;
  else if (has("red bull|monster|energy drink|pre-workout|preworkout")) mg = 80;
  else if (has("coke|cola|pepsi")) mg = 35;
  else if (has("dark chocolate|bournville|cocoa|cacao")) mg = 20;
  else if (has("chocolate")) mg = 6;
  if (mg && /\b(two|2|three|3)\s+(cups|glasses|shots|mugs)\b/.test(n)) mg *= 2;
  return mg;
}

function macroPayload(args: Args) {
  const caffeine = args.caffeine === undefined || args.caffeine === null
    ? estimateCaffeineMg(String(args.food_name ?? ""))
    : boundedNumber("caffeine", args.caffeine, 0, 2000);
  return {
    calories: Math.round(boundedNumber("calories", args.calories, 0, 10000, false) as number),
    protein: boundedNumber("protein", args.protein, 0, 500),
    carbs: boundedNumber("carbs", args.carbs, 0, 1500),
    fat: boundedNumber("fat", args.fat, 0, 500),
    fiber: boundedNumber("fiber", args.fiber, 0, 200),
    sugar: boundedNumber("sugar", args.sugar, 0, 800),
    sodium: boundedNumber("sodium", args.sodium, 0, 20000),
    potassium: boundedNumber("potassium", args.potassium, 0, 20000),
    caffeine,
  };
}

async function logMeal(args: Args, db: Client, userId: string, today: string) {
  const date = assertWritableDate(args.date || today, today);
  const payload = {
    user_id: userId,
    date,
    meal_type: oneOf("meal_type", args.meal_type, MEAL_TYPES, "snack"),
    food_name: requireString("food_name", args.food_name, 200),
    ...macroPayload(args),
    notes: args.notes ? String(args.notes).slice(0, 500) : null,
    is_confirmed: true,
    nutrition_source: "mcp_estimate",
    source_metadata: { via: "mcp", client_key: args.client_key ?? null, estimated_by: "assistant" },
  };
  if (args.client_key) {
    const { data: existing } = await db.from("meals").select("id").eq("date", date).eq("source_metadata->>client_key", String(args.client_key)).limit(1);
    const id = (Array.isArray(existing) ? existing[0] : existing)?.id;
    if (id) return ok("meal_updated", await write("meal_update", () => db.from("meals").update(payload).eq("id", id).select().single()));
  }
  return ok("meal_logged", await write("meal_insert", () => db.from("meals").insert(payload).select().single()));
}

async function updateMeal(args: Args, db: Client, userId: string, today: string) {
  const id = requireString("meal_id", args.meal_id, 40);
  const patch: Args = {};
  if (args.date !== undefined) patch.date = assertWritableDate(args.date, today);
  if (args.meal_type !== undefined) patch.meal_type = oneOf("meal_type", args.meal_type, MEAL_TYPES);
  if (args.food_name !== undefined) patch.food_name = requireString("food_name", args.food_name, 200);
  if (args.notes !== undefined) patch.notes = String(args.notes).slice(0, 500);
  for (const [key, value] of Object.entries(macroPayload({ calories: args.calories ?? 0, ...args }))) {
    if (args[key] !== undefined) patch[key] = value;
  }
  // Renaming a meal without giving caffeine re-derives it from the new name.
  if (args.food_name !== undefined && args.caffeine === undefined) {
    patch.caffeine = estimateCaffeineMg(String(args.food_name));
  }
  if (!Object.keys(patch).length) throw new Error("NO_FIELDS_TO_UPDATE");
  const row = await write<any>("meal_update", () => db.from("meals").update(patch).eq("id", id).eq("user_id", userId).select().maybeSingle());
  if (!row) throw new Error("MEAL_NOT_FOUND");
  return ok("meal_updated", row);
}

/* ------------------------------- water ------------------------------- */

async function logWater(args: Args, db: Client, userId: string, today: string, timezone: string) {
  const litres = args.litres !== undefined
    ? boundedNumber("litres", args.litres, 0.05, 10, false)!
    : round((boundedNumber("milliliters", args.milliliters, 50, 10000, false) as number) / 1000, 3);
  const date = assertWritableDate(args.date || today, today);
  // Current logs retain their true instant; backdated entries land at noon in
  // the caller's timezone so day bucketing is stable worldwide.
  const timestamp = date === today ? new Date().toISOString() : zonedIso(date, "12:00:00", timezone);
  const row = await write<any>("water_insert", () => db.from("water_logs").insert({ user_id: userId, amount: litres, method: "automation", timestamp }).select().single());
  return ok("water_logged", row, { litres });
}

/* ------------------------------ workouts ------------------------------ */

type ExerciseInput = { name: string; category?: string; sets?: Array<{ reps?: number | string; weight?: number | string }> };

function exerciseRows(exercises: ExerciseInput[], workoutId: string) {
  return exercises.flatMap((exercise, exIdx) => {
    const name = requireString("exercise_name", exercise.name, 120);
    const category = oneOf("category", exercise.category, ["primary", "compound", "accessory", "specialization", "core"] as const, "accessory");
    const sets = Array.isArray(exercise.sets) && exercise.sets.length ? exercise.sets : [{}];
    return sets.map((set, setIdx) => {
      const reps = boundedNumber("reps", set.reps, 0, 1000);
      const weight = boundedNumber("weight", set.weight, 0, 600);
      return {
        workout_id: workoutId,
        name: `${name} (Set ${setIdx + 1})`,
        category,
        actual_reps: reps === null ? null : String(reps),
        actual_weight: weight === null ? null : String(weight),
        target_reps: reps === null ? null : String(reps),
        target_weight: weight === null ? null : String(weight),
        completed: true,
        sort_order: exIdx * 100 + setIdx,
      };
    });
  });
}

async function persistWorkoutEnergy(db: Client, userId: string, workout: Args, rows: Args[], prefs: Args) {
  const weightKg = await effectiveWeight(db, workout.date, prefs);
  const compoundSets = rows.filter(r => ["primary", "compound"].includes(r.category)).length;
  const estimate = estimateWorkoutEnergyMcp({ durationMinutes: workout.workout_duration_minutes || 0, completedSets: rows.length, compoundSets, weightKg });
  const inputs = { effectiveWeightKg: weightKg, intensity: estimate.intensity, met: estimate.met, completedSets: rows.length, compoundSets, via: "mcp" };
  await write("workout_energy", () => db.from("workouts").update({
    energy_model_version: ENERGY_MODEL_VERSION,
    estimated_net_kcal: estimate.netKcal,
    energy_confidence: estimate.confidence,
    energy_inputs: inputs,
  }).eq("id", workout.id).eq("user_id", userId));
  if (estimate.netKcal > 0) {
    const existing = await write<any>("workout_burn_lookup", () => db.from("calorie_burns").select("id").eq("user_id", userId).eq("source", "workout").eq("activity_type", `workout:${workout.id}`).maybeSingle());
    const burn = {
      user_id: userId, date: workout.date, source: "workout", activity_type: `workout:${workout.id}`,
      duration_minutes: workout.workout_duration_minutes || 0, calories: estimate.netKcal,
      intensity_band: estimate.intensity, intensity_source: "workout_structure", met_estimate: estimate.met,
      effective_weight_kg: weightKg, confidence: estimate.confidence, energy_model_version: ENERGY_MODEL_VERSION,
      calculation_inputs: inputs,
    };
    await write("workout_burn", () => existing
      ? db.from("calorie_burns").update(burn).eq("id", existing.id).eq("user_id", userId)
      : db.from("calorie_burns").insert(burn));
  } else {
    await write("workout_burn_clear", () => db.from("calorie_burns").delete().eq("user_id", userId).eq("source", "workout").eq("activity_type", `workout:${workout.id}`));
  }
  return estimate;
}

export async function logWorkout(args: Args, db: Client, userId: string, today: string, prefs: Args, timezone: string) {
  const date = assertWritableDate(args.date || today, today);
  const exercises: ExerciseInput[] = Array.isArray(args.exercises) ? args.exercises : [];
  if (!exercises.length) throw new Error("MISSING_EXERCISES");
  const duration = boundedNumber("duration_minutes", args.duration_minutes ?? 45, 1, 480, false)!;
  const name = requireString("workout_name", args.workout_name || "Workout", 80);
  const id = typeof args.client_key === "string" && args.client_key.trim()
    ? (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.client_key.trim())
      ? args.client_key.trim()
      : await stableUuid(`${userId}:${args.client_key.trim()}`))
    : crypto.randomUUID();

  const existingRows = await db.from("workouts").select("id").eq("id", id).limit(1);
  const already = Array.isArray(existingRows?.data) ? existingRows.data[0] : null;
  const startedAt = args.start_time ? zonedIso(date, requireString("start_time", args.start_time, 8), timezone) : null;
  const completedAt = startedAt ? new Date(Date.parse(startedAt) + duration * 60000).toISOString() : null;
  const payload = {
    id, user_id: userId, date, day: name.slice(0, 40), day_name: name,
    week_number: boundedNumber("week_number", args.week_number ?? 1, 1, 520, false)!,
    workout_duration_minutes: duration,
    started_at: startedAt,
    completed_at: completedAt,
    explicit_pause_seconds: 0,
    energy_inputs: {},
  };

  if (!already) {
    await write("workout_insert", () => db.from("workouts").insert(payload));
  } else {
    await write("workout_update", () => db.from("workouts").update({
      date,
      day: name.slice(0, 40),
      day_name: name,
      workout_duration_minutes: duration,
      started_at: startedAt,
      completed_at: completedAt,
    }).eq("id", id).eq("user_id", userId));
    await write("workout_sets_clear", () => db.from("exercises").delete().eq("workout_id", id));
  }
  const rows = exerciseRows(exercises, id);
  await write("workout_sets", () => db.from("exercises").insert(rows));
  const estimate = await persistWorkoutEnergy(db, userId, { id, date, workout_duration_minutes: duration }, rows, prefs);
  return ok(already ? "workout_updated" : "workout_logged", { workout_id: id, date, workout_name: name, duration_minutes: duration, sets_logged: rows.length, estimated_burn_kcal: estimate.netKcal });
}

async function updateWorkout(args: Args, db: Client, userId: string, today: string, prefs: Args, timezone: string) {
  const id = requireString("workout_id", args.workout_id, 40);
  const current = await write<any>("workout_lookup", () => db.from("workouts").select("id,date,day_name,workout_duration_minutes,started_at,completed_at").eq("id", id).eq("user_id", userId).maybeSingle());
  if (!current) throw new Error("WORKOUT_NOT_FOUND");

  const patch: Args = {};
  if (args.date !== undefined) patch.date = assertWritableDate(args.date, today);
  if (args.workout_name !== undefined) patch.day_name = requireString("workout_name", args.workout_name, 80);
  if (args.duration_minutes !== undefined) patch.workout_duration_minutes = boundedNumber("duration_minutes", args.duration_minutes, 1, 480, false);
  const date = patch.date ?? current.date;
  const duration = patch.workout_duration_minutes ?? current.workout_duration_minutes ?? 45;

  // Preserve the user's local start clock when moving a workout to another
  // date. Duration edits also move completed_at so the timestamps agree with
  // workout_duration_minutes.
  if (current.started_at && (patch.date !== undefined || patch.workout_duration_minutes !== undefined)) {
    const startedAt = patch.date !== undefined ? zonedIso(date, localClock(current.started_at, timezone), timezone) : current.started_at;
    patch.started_at = startedAt;
    patch.completed_at = new Date(Date.parse(startedAt) + Number(duration) * 60000).toISOString();
  }

  if (Object.keys(patch).length) await write("workout_patch", () => db.from("workouts").update(patch).eq("id", id).eq("user_id", userId));

  let rows: Args[];
  if (Array.isArray(args.exercises) && args.exercises.length) {
    await write("workout_sets_clear", () => db.from("exercises").delete().eq("workout_id", id));
    rows = exerciseRows(args.exercises, id);
    await write("workout_sets", () => db.from("exercises").insert(rows));
  } else {
    rows = (await write<any[]>("workout_sets_read", () => db.from("exercises").select("category").eq("workout_id", id))) || [];
  }
  const estimate = await persistWorkoutEnergy(db, userId, { id, date, workout_duration_minutes: duration }, rows, prefs);
  return ok("workout_updated", { workout_id: id, date, duration_minutes: duration, sets_logged: rows.length, estimated_burn_kcal: estimate.netKcal });
}

/* ----------------------------- activities ----------------------------- */

function activityKind(value: unknown): ActivityKind {
  const alias: Record<string, string> = { walk: "walking", run: "running", cycle: "cycling", ride: "cycling", bike: "cycling" };
  const raw = String(value ?? "").toLowerCase().trim();
  return oneOf("activity_type", alias[raw] ?? raw, ACTIVITY_KINDS) as ActivityKind;
}

/** Builds the stored row plus a plain explanation of how calories were derived. */
async function activityPayload(input: { kind: ActivityKind; distance: number | null; duration: number | null; calories: number | null; steps: number | null }, db: Client, userId: string, date: string, prefs: Args) {
  const { kind, distance, duration, steps } = input;
  if (distance === null && duration === null) throw new Error("MISSING_DISTANCE_OR_DURATION");
  const weightKg = await effectiveWeight(db, date, prefs);
  const estimate = estimateActivityEnergy(kind, weightKg, distance, duration);
  const calories = input.calories !== null ? Math.round(input.calories) : estimate.netKcal;
  const calculation = {
    calories_source: input.calories !== null ? "supplied" : "estimated",
    duration_source: duration !== null ? "supplied" : "assumed_from_typical_pace",
    pace_min_per_km: estimate.paceMinutesPerKm,
    pace_source: distance === null ? "no_distance_typical_intensity" : estimate.paceSource,
    met: estimate.met,
    bodyweight_kg: weightKg,
    duration_minutes_used: estimate.durationMinutes || duration,
    formula: "(MET - 1) x 3.5 x kg / 200 x minutes (net of resting burn)",
  };
  return {
    estimate, calculation,
    row: {
      user_id: userId, date, source: "manual", activity_type: kind,
      duration_minutes: duration !== null ? Math.round(duration) : Math.round(estimate.durationMinutes) || 0,
      distance_km: distance, calories, steps,
      intensity_band: "pace_based", intensity_source: estimate.paceSource, met_estimate: estimate.met,
      effective_weight_kg: weightKg, confidence: estimate.confidence,
      energy_model_version: ENERGY_MODEL_VERSION,
      calculation_inputs: { ...calculation, via: "mcp" },
    },
  };
}

async function logActivity(args: Args, db: Client, userId: string, today: string, prefs: Args) {
  const date = assertWritableDate(args.date || today, today);
  const { row, calculation } = await activityPayload({
    kind: activityKind(args.activity_type),
    distance: boundedNumber("distance_km", args.distance_km, 0.1, 500),
    duration: boundedNumber("duration_minutes", args.duration_minutes, 1, 1440),
    calories: boundedNumber("calories", args.calories, 0, 5000),
    steps: args.steps == null ? null : Math.round(boundedNumber("steps", args.steps, 0, 200000) as number),
  }, db, userId, date, prefs);
  const saved = await write<any>("activity_upsert", () => db.from("calorie_burns").upsert(row, { onConflict: "user_id,date,source,activity_type" }).select().single());
  return ok("activity_logged", saved, { calculation });
}

/** Pass null for distance_km, duration_minutes, calories or steps to clear it. Omitted fields keep their stored value. */
async function updateActivity(args: Args, db: Client, userId: string, today: string, prefs: Args) {
  const id = args.activity_id ? requireString("activity_id", args.activity_id, 40) : null;
  let existing: Args | null = null;
  if (id) {
    existing = await write<any>("activity_lookup", () => db.from("calorie_burns").select("*").eq("id", id).eq("user_id", userId).maybeSingle());
  } else {
    const date = assertWritableDate(args.date || today, today);
    const rows = await write<any[]>("activity_lookup", () => db.from("calorie_burns").select("*").eq("user_id", userId).eq("date", date).eq("source", "manual").eq("activity_type", activityKind(args.activity_type)).limit(1));
    existing = rows?.[0] ?? null;
  }
  if (!existing) throw new Error("ACTIVITY_NOT_FOUND");
  const pick = (key: string, min: number, max: number) => key in args ? boundedNumber(key, args[key], min, max) : (existing![key] ?? null);
  const date = args.date !== undefined ? assertWritableDate(args.date, today) : existing.date;
  const caloriesTouched = "calories" in args && args.calories !== null;
  const { row, calculation } = await activityPayload({
    kind: activityKind(args.activity_type ?? existing.activity_type),
    distance: pick("distance_km", 0.1, 500),
    duration: pick("duration_minutes", 1, 1440),
    // Changing distance or duration re-estimates calories unless calories is given.
    calories: caloriesTouched ? boundedNumber("calories", args.calories, 0, 5000) : null,
    steps: "steps" in args ? (args.steps === null ? null : Math.round(boundedNumber("steps", args.steps, 0, 200000) as number)) : (existing.steps ?? null),
  }, db, userId, date, prefs);
  const saved = await write<any>("activity_update", () => db.from("calorie_burns").update(row).eq("id", existing!.id).eq("user_id", userId).select().maybeSingle());
  if (!saved) throw new Error("ACTIVITY_NOT_FOUND");
  return ok("activity_updated", saved, { calculation, previous: { distance_km: existing.distance_km, duration_minutes: existing.duration_minutes, calories: existing.calories, steps: existing.steps ?? null } });
}

/* -------------------------- physique check-ins -------------------------- */

/** Measurements are optional individually; at least one must be present so an
 *  empty check-in never lands in the trend. */
function physiquePayload(args: Args) {
  const row: Args = {
    bodyweight: boundedNumber("bodyweight", args.bodyweight, 20, 400),
    waist_cm: boundedNumber("waist_cm", args.waist_cm, 30, 250),
    upper_arm_left_cm: boundedNumber("upper_arm_left_cm", args.upper_arm_left_cm, 10, 100),
    upper_arm_right_cm: boundedNumber("upper_arm_right_cm", args.upper_arm_right_cm, 10, 100),
    chest_cm: boundedNumber("chest_cm", args.chest_cm, 40, 250),
    calf_left_cm: boundedNumber("calf_left_cm", args.calf_left_cm, 10, 100),
    calf_right_cm: boundedNumber("calf_right_cm", args.calf_right_cm, 10, 100),
    body_fat_percentage: boundedNumber("body_fat_percentage", args.body_fat_percentage, 2, 70),
  };
  return row;
}

async function logPhysiqueCheckin(args: Args, db: Client, userId: string, today: string) {
  const date = assertWritableDate(args.checkin_date || args.date || today, today);
  const row = physiquePayload(args);
  if (Object.values(row).every(value => value === null)) throw new Error("MISSING_MEASUREMENTS");
  const existing = await write<any>("physique_lookup", () => db.from("physique_checkins").select("id").eq("user_id", userId).eq("checkin_date", date).limit(1).maybeSingle());
  if (existing?.id) {
    const updated = await write<any>("physique_update", () => db.from("physique_checkins").update(row).eq("id", existing.id).eq("user_id", userId).select().single());
    return ok("physique_checkin_updated", updated);
  }
  const saved = await write<any>("physique_insert", () => db.from("physique_checkins").insert({ user_id: userId, checkin_date: date, photo_paths: [], ...row }).select().single());
  return ok("physique_checkin_logged", saved);
}

async function updatePhysiqueCheckin(args: Args, db: Client, userId: string, today: string) {
  const id = args.checkin_id ? requireString("checkin_id", args.checkin_id, 40) : null;
  if (!id) return await logPhysiqueCheckin(args, db, userId, today);
  const row = physiquePayload(args);
  const patch: Args = {};
  for (const [key, value] of Object.entries(row)) if (value !== null) patch[key] = value;
  if (args.checkin_date || args.date) patch.checkin_date = assertWritableDate(args.checkin_date || args.date, today);
  if (!Object.keys(patch).length) throw new Error("NOTHING_TO_UPDATE");
  const saved = await write<any>("physique_update", () => db.from("physique_checkins").update(patch).eq("id", id).eq("user_id", userId).select().maybeSingle());
  if (!saved) throw new Error("PHYSIQUE_CHECKIN_NOT_FOUND");
  return ok("physique_checkin_updated", saved);
}

/* ------------------------------ dispatcher ------------------------------ */

export async function executeWriteTool(name: string, args: Args, db: Client, userId: string, timezone: string) {
  const zone = timezone || "Asia/Kolkata";
  const today = todayIn(zone);
  const prefs = await preferences(db);
  const run = async () => {
    switch (name) {
      case "log_meal": return await logMeal(args, db, userId, today);
      case "update_meal": return await updateMeal(args, db, userId, today);
      case "log_water": return await logWater(args, db, userId, today, zone);
      case "log_workout": return await logWorkout(args, db, userId, today, prefs, zone);
      case "update_workout": return await updateWorkout(args, db, userId, today, prefs, zone);
      case "log_activity": return await logActivity(args, db, userId, today, prefs);
      case "update_activity": return await updateActivity(args, db, userId, today, prefs);
      case "set_workout_trigger": return await setWorkoutTrigger(db, userId, args);
      case "cancel_workout_trigger": return await cancelWorkoutTrigger(db, userId, args);
      case "send_coach_note": return await sendCoachNote(db, args);
      case "log_physique_checkin": return await logPhysiqueCheckin(args, db, userId, today);
      case "update_physique_checkin": return await updatePhysiqueCheckin(args, db, userId, today);
      default: throw new Error("UNKNOWN_TOOL");
    }
  };
  return { ...(await run()), timezone: zone };
}
