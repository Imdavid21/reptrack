/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * MCP write tools. Scope is deliberately narrow: meals/nutrition, water,
 * workouts and activities. There is no delete path, and every row is written
 * for the authenticated user through the user-scoped PostgREST client so RLS applies.
 */
import { assertWritableDate, boundedNumber, categorizeDbError, localDayBounds, round, withRetry } from "./core.ts";
import { ENERGY_MODEL_VERSION, estimateActivityEnergy, estimateWorkoutEnergyMcp, type ActivityKind } from "./energy.ts";

type Client = any;
type Args = Record<string, any>;

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const ACTIVITY_KINDS = ["walking", "running", "cycling"] as const;

async function write<T>(label: string, build: () => any): Promise<T> {
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

function todayIn(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function localClockIn(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date()).reduce<Record<string, string>>((acc, part) => (acc[part.type] = part.value, acc), {});
  return `${parts.hour}:${parts.minute}`;
}

function localDateTime(date: string, time: string, timezone: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error("INVALID_TIME");
  const [hours, minutes] = time.split(":").map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) throw new Error("INVALID_TIME");
  const { start } = localDayBounds(date, timezone);
  return new Date(Date.parse(start) + hours * 3600000 + minutes * 60000).toISOString();
}

function zonedDateTimeParts(timestamp: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(timestamp)).reduce<Record<string, string>>((acc, part) => (acc[part.type] = part.value, acc), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function occurrenceTimestamp(date: string, time: unknown, today: string, timezone: string) {
  const resolvedTime = typeof time === "string" && time.trim() ? time.trim() : localClockIn(timezone);
  const timestamp = localDateTime(date, resolvedTime, timezone);
  if (date === today && Date.parse(timestamp) > Date.now() + 60000) throw new Error("TIME_IN_FUTURE");
  return timestamp;
}

function completedInterval(date: string, startTime: unknown, durationMinutes: number, today: string, timezone: string) {
  if (typeof startTime === "string" && startTime.trim()) {
    const startedAt = localDateTime(date, startTime.trim(), timezone);
    const endedAt = new Date(Date.parse(startedAt) + durationMinutes * 60000).toISOString();
    if (date === today && Date.parse(startedAt) > Date.now() + 60000) throw new Error("TIME_IN_FUTURE");
    if (date === today && Date.parse(endedAt) > Date.now() + 60000) throw new Error("END_TIME_IN_FUTURE");
    return { startedAt, endedAt, source: "supplied_start_time" };
  }
  if (date !== today) throw new Error("BACKDATED_TIME_REQUIRED");
  const endedAt = new Date().toISOString();
  const startedAt = new Date(Date.parse(endedAt) - durationMinutes * 60000).toISOString();
  return { startedAt, endedAt, source: "inferred_from_completion" };
}

async function preferences(db: Client) {
  try {
    const { data } = await db.from("user_preferences").select("*").limit(1);
    return (Array.isArray(data) ? data[0] : data) ?? {};
  } catch { return {}; }
}

async function effectiveWeight(db: Client, date: string, prefs: Args): Promise<number> {
  try {
    const { data } = await db.from("daily_metrics").select("date,bodyweight").not("bodyweight", "is", null).lte("date", date).order("date", { ascending: false }).limit(1);
    const w = Number((Array.isArray(data) ? data[0] : data)?.bodyweight);
    if (Number.isFinite(w) && w > 0) return w;
  } catch { /* fall through */ }
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

async function stableUuid(seed: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/* ------------------------------- meals ------------------------------- */

function macroPayload(args: Args) {
  return {
    calories: boundedNumber("calories", args.calories, 0, 10000, false),
    protein: boundedNumber("protein", args.protein, 0, 500),
    carbs: boundedNumber("carbs", args.carbs, 0, 1500),
    fat: boundedNumber("fat", args.fat, 0, 500),
    fiber: boundedNumber("fiber", args.fiber, 0, 200),
    sugar: boundedNumber("sugar", args.sugar, 0, 800),
    sodium: boundedNumber("sodium", args.sodium, 0, 20000),
    potassium: boundedNumber("potassium", args.potassium, 0, 20000),
    caffeine_mg: boundedNumber("caffeine_mg", args.caffeine_mg, 0, 2000),
  };
}

async function logMeal(args: Args, db: Client, userId: string, today: string, timezone: string) {
  const date = assertWritableDate(args.date || today, today);
  const consumedAt = occurrenceTimestamp(date, args.time, today, timezone);
  const payload = {
    user_id: userId,
    date,
    consumed_at: consumedAt,
    meal_type: oneOf("meal_type", args.meal_type, MEAL_TYPES, "snack"),
    food_name: requireString("food_name", args.food_name, 200),
    ...macroPayload(args),
    notes: args.notes ? String(args.notes).slice(0, 500) : null,
    is_confirmed: true,
    nutrition_source: "mcp_estimate",
    source_metadata: { via: "mcp", client_key: args.client_key ?? null, estimated_by: "assistant", caffeine_assessed: args.caffeine_mg !== undefined, occurrence_time_supplied: args.time !== undefined },
  };
  if (args.client_key) {
    const { data: existing } = await db.from("meals").select("id").eq("date", date).eq("source_metadata->>client_key", String(args.client_key)).limit(1);
    const id = (Array.isArray(existing) ? existing[0] : existing)?.id;
    if (id) return ok("meal_updated", await write("meal_update", () => db.from("meals").update(payload).eq("id", id).select().single()));
  }
  return ok("meal_logged", await write("meal_insert", () => db.from("meals").insert(payload).select().single()));
}

async function updateMeal(args: Args, db: Client, userId: string, today: string, timezone: string) {
  const id = requireString("meal_id", args.meal_id, 40);
  const current = await write<any>("meal_lookup", () => db.from("meals").select("id,date,consumed_at").eq("id", id).eq("user_id", userId).maybeSingle());
  if (!current) throw new Error("MEAL_NOT_FOUND");
  const patch: Args = {};
  if (args.date !== undefined) patch.date = assertWritableDate(args.date, today);
  if (args.meal_type !== undefined) patch.meal_type = oneOf("meal_type", args.meal_type, MEAL_TYPES);
  if (args.food_name !== undefined) patch.food_name = requireString("food_name", args.food_name, 200);
  if (args.notes !== undefined) patch.notes = String(args.notes).slice(0, 500);
  for (const [key, value] of Object.entries(macroPayload({ calories: args.calories ?? 0, ...args }))) {
    if (args[key] !== undefined) patch[key] = value;
  }
  if (args.date !== undefined || args.time !== undefined) {
    const existing = current.consumed_at ? zonedDateTimeParts(current.consumed_at, timezone) : { date: current.date, time: localClockIn(timezone) };
    const date = assertWritableDate(args.date || existing.date, today);
    patch.date = date;
    patch.consumed_at = occurrenceTimestamp(date, args.time || existing.time, today, timezone);
  }
  if (!Object.keys(patch).length) throw new Error("NO_FIELDS_TO_UPDATE");
  const row = await write<any>("meal_update", () => db.from("meals").update(patch).eq("id", id).eq("user_id", userId).select().maybeSingle());
  if (!row) throw new Error("MEAL_NOT_FOUND");
  return ok("meal_updated", row);
}

/* ------------------------------- water ------------------------------- */

async function logWater(args: Args, db: Client, userId: string, today: string) {
  const litres = args.litres !== undefined
    ? boundedNumber("litres", args.litres, 0.05, 10, false)!
    : round((boundedNumber("milliliters", args.milliliters, 50, 10000, false) as number) / 1000, 3);
  const date = assertWritableDate(args.date || today, today);
  const timestamp = date === today ? new Date().toISOString() : `${date}T12:00:00.000Z`;
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
    await write("workout_burn", () => db.from("calorie_burns").upsert({
      user_id: userId,
      date: workout.date,
      source: "workout",
      activity_type: `workout:${workout.id}`,
      duration_minutes: workout.workout_duration_minutes || 0,
      calories: estimate.netKcal,
      started_at: workout.started_at ?? null,
      ended_at: workout.completed_at ?? null,
      intensity_band: estimate.intensity,
      intensity_source: "workout_structure",
      met_estimate: estimate.met,
      effective_weight_kg: weightKg,
      confidence: estimate.confidence,
      energy_model_version: ENERGY_MODEL_VERSION,
      calculation_inputs: { ...inputs, eventTimeSource: workout.started_at ? "workout_session" : "legacy_unknown" },
    }, { onConflict: "user_id,date,source,activity_type" }));
  }
  return estimate;
}

async function logWorkout(args: Args, db: Client, userId: string, today: string, prefs: Args, timezone: string) {
  const date = assertWritableDate(args.date || today, today);
  const exercises: ExerciseInput[] = Array.isArray(args.exercises) ? args.exercises : [];
  if (!exercises.length) throw new Error("MISSING_EXERCISES");
  const duration = boundedNumber("duration_minutes", args.duration_minutes ?? 45, 1, 480, false)!;
  const name = requireString("workout_name", args.workout_name || "Workout", 80);
  const timing = completedInterval(date, args.start_time, duration, today, timezone);
  const id = typeof args.client_key === "string" && args.client_key.trim()
    ? (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.client_key.trim())
      ? args.client_key.trim()
      : await stableUuid(`${userId}:${args.client_key.trim()}`))
    : crypto.randomUUID();

  const existingRows = await db.from("workouts").select("id").eq("id", id).limit(1);
  const already = Array.isArray(existingRows?.data) ? existingRows.data[0] : null;

  const payload = {
    id,
    user_id: userId,
    date,
    day: name.slice(0, 40),
    day_name: name,
    week_number: boundedNumber("week_number", args.week_number ?? 1, 1, 520, false)!,
    workout_duration_minutes: duration,
    started_at: timing.startedAt,
    completed_at: timing.endedAt,
    explicit_pause_seconds: 0,
    energy_inputs: { eventTimeSource: timing.source },
  };

  if (!already) {
    await write("workout_insert", () => db.from("workouts").insert(payload));
  } else {
    await write("workout_update", () => db.from("workouts").update({ date, day_name: name, workout_duration_minutes: duration, started_at: timing.startedAt, completed_at: timing.endedAt }).eq("id", id).eq("user_id", userId));
    await write("workout_sets_clear", () => db.from("exercises").delete().eq("workout_id", id));
  }
  const rows = exerciseRows(exercises, id);
  await write("workout_sets", () => db.from("exercises").insert(rows));
  const estimate = await persistWorkoutEnergy(db, userId, { id, date, workout_duration_minutes: duration, started_at: timing.startedAt, completed_at: timing.endedAt }, rows, prefs);
  return ok(already ? "workout_updated" : "workout_logged", { workout_id: id, date, workout_name: name, duration_minutes: duration, started_at: timing.startedAt, completed_at: timing.endedAt, sets_logged: rows.length, estimated_burn_kcal: estimate.netKcal });
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
  let startedAt: string | null = current.started_at ?? null;
  if (args.start_time !== undefined) {
    startedAt = localDateTime(date, String(args.start_time), timezone);
  } else if (patch.date && current.started_at) {
    startedAt = localDateTime(date, zonedDateTimeParts(current.started_at, timezone).time, timezone);
  }
  if (startedAt && (args.start_time !== undefined || patch.date !== undefined || patch.workout_duration_minutes !== undefined)) {
    const completedAt = new Date(Date.parse(startedAt) + Number(duration) * 60000).toISOString();
    if (date === today && Date.parse(completedAt) > Date.now() + 60000) throw new Error("END_TIME_IN_FUTURE");
    patch.started_at = startedAt;
    patch.completed_at = completedAt;
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
  if (patch.date && patch.date !== current.date) {
    await db.from("calorie_burns").delete().eq("user_id", userId).eq("date", current.date).eq("activity_type", `workout:${id}`);
  }
  const finalStartedAt = patch.started_at ?? current.started_at ?? null;
  const finalCompletedAt = patch.completed_at ?? current.completed_at ?? (finalStartedAt ? new Date(Date.parse(finalStartedAt) + Number(duration) * 60000).toISOString() : null);
  const estimate = await persistWorkoutEnergy(db, userId, { id, date, workout_duration_minutes: duration, started_at: finalStartedAt, completed_at: finalCompletedAt }, rows, prefs);
  return ok("workout_updated", { workout_id: id, date, duration_minutes: duration, started_at: finalStartedAt, completed_at: finalCompletedAt, sets_logged: rows.length, estimated_burn_kcal: estimate.netKcal });
}

/* ----------------------------- activities ----------------------------- */

async function activityPayload(args: Args, db: Client, userId: string, date: string, prefs: Args) {
  const alias: Record<string, string> = { walk: "walking", run: "running", cycle: "cycling", ride: "cycling", bike: "cycling" };
  const rawKind = String(args.activity_type ?? "").toLowerCase().trim();
  const kind = oneOf("activity_type", alias[rawKind] ?? rawKind, ACTIVITY_KINDS) as ActivityKind;

  const distance = boundedNumber("distance_km", args.distance_km, 0.1, 500);
  const duration = boundedNumber("duration_minutes", args.duration_minutes, 1, 1440);
  if (distance === null && duration === null) throw new Error("MISSING_DISTANCE_OR_DURATION");
  const weightKg = await effectiveWeight(db, date, prefs);
  const estimate = estimateActivityEnergy(kind, weightKg, distance, duration);
  const calories = boundedNumber("calories", args.calories, 0, 5000) ?? estimate.netKcal;
  return {
    kind,
    estimate,
    calories,
    row: {
      user_id: userId,
      date,
      source: "manual",
      activity_type: kind,
      duration_minutes: Math.round(estimate.durationMinutes) || duration || 0,
      distance_km: distance,
      calories,
      intensity_band: "pace_based",
      intensity_source: estimate.paceSource,
      met_estimate: estimate.met,
      effective_weight_kg: weightKg,
      confidence: estimate.confidence,
      energy_model_version: ENERGY_MODEL_VERSION,
      calculation_inputs: { paceMinutesPerKm: estimate.paceMinutesPerKm, paceSource: estimate.paceSource, via: "mcp" },
    },
  };
}

async function logActivity(args: Args, db: Client, userId: string, today: string, prefs: Args, timezone: string) {
  const date = assertWritableDate(args.date || today, today);
  const { row, estimate } = await activityPayload(args, db, userId, date, prefs);
  const timing = completedInterval(date, args.start_time, Number(row.duration_minutes), today, timezone);
  row.started_at = timing.startedAt;
  row.ended_at = timing.endedAt;
  row.calculation_inputs = { ...row.calculation_inputs, eventTimeSource: timing.source };
  const saved = await write<any>("activity_upsert", () => db.from("calorie_burns").upsert(row, { onConflict: "user_id,date,source,activity_type" }).select().single());
  return ok("activity_logged", saved, { met: estimate.met, pace_source: estimate.paceSource, started_at: timing.startedAt, ended_at: timing.endedAt });
}

async function updateActivity(args: Args, db: Client, userId: string, today: string, prefs: Args, timezone: string) {
  const date = assertWritableDate(args.date || today, today);
  const id = args.activity_id ? requireString("activity_id", args.activity_id, 40) : null;
  const { row, kind } = await activityPayload(args, db, userId, date, prefs);
  let current: any = null;
  if (id) {
    current = await write<any>("activity_lookup", () => db.from("calorie_burns").select("id,date,started_at,ended_at").eq("id", id).eq("user_id", userId).maybeSingle());
    if (!current) throw new Error("ACTIVITY_NOT_FOUND");
  } else {
    const { data } = await db.from("calorie_burns").select("id,date,started_at,ended_at").eq("user_id", userId).eq("date", date).eq("source", "manual").eq("activity_type", kind).limit(1);
    current = Array.isArray(data) ? data[0] : data;
  }

  let startedAt: string | null = current?.started_at ?? null;
  let endedAt: string | null = current?.ended_at ?? null;
  if (args.start_time !== undefined) {
    const timing = completedInterval(date, args.start_time, Number(row.duration_minutes), today, timezone);
    startedAt = timing.startedAt;
    endedAt = timing.endedAt;
    row.calculation_inputs = { ...row.calculation_inputs, eventTimeSource: timing.source };
  } else if (startedAt) {
    const existingClock = zonedDateTimeParts(startedAt, timezone).time;
    startedAt = localDateTime(date, existingClock, timezone);
    endedAt = new Date(Date.parse(startedAt) + Number(row.duration_minutes) * 60000).toISOString();
    row.calculation_inputs = { ...row.calculation_inputs, eventTimeSource: "preserved_existing_start" };
  } else if (!current) {
    const timing = completedInterval(date, undefined, Number(row.duration_minutes), today, timezone);
    startedAt = timing.startedAt;
    endedAt = timing.endedAt;
    row.calculation_inputs = { ...row.calculation_inputs, eventTimeSource: timing.source };
  } else {
    row.calculation_inputs = { ...row.calculation_inputs, eventTimeSource: "legacy_unknown" };
  }
  row.started_at = startedAt;
  row.ended_at = endedAt;

  if (id) {
    const saved = await write<any>("activity_update", () => db.from("calorie_burns").update(row).eq("id", id).eq("user_id", userId).select().maybeSingle());
    if (!saved) throw new Error("ACTIVITY_NOT_FOUND");
    return ok("activity_updated", saved);
  }
  const saved = await write<any>("activity_upsert", () => db.from("calorie_burns").upsert(row, { onConflict: "user_id,date,source,activity_type" }).select().single());
  return ok("activity_updated", saved);
}

/* ------------------------------ dispatcher ------------------------------ */

export async function executeWriteTool(name: string, args: Args, db: Client, userId: string, timezone: string) {
  const resolvedTimezone = timezone || "Asia/Kolkata";
  const today = todayIn(resolvedTimezone);
  const prefs = await preferences(db);
  const run = async () => {
    switch (name) {
      case "log_meal": return await logMeal(args, db, userId, today, resolvedTimezone);
      case "update_meal": return await updateMeal(args, db, userId, today, resolvedTimezone);
      case "log_water": return await logWater(args, db, userId, today);
      case "log_workout": return await logWorkout(args, db, userId, today, prefs, resolvedTimezone);
      case "update_workout": return await updateWorkout(args, db, userId, today, prefs, resolvedTimezone);
      case "log_activity": return await logActivity(args, db, userId, today, prefs, resolvedTimezone);
      case "update_activity": return await updateActivity(args, db, userId, today, prefs, resolvedTimezone);
      default: throw new Error("UNKNOWN_TOOL");
    }
  };
  return { ...(await run()), timezone: resolvedTimezone };
}
