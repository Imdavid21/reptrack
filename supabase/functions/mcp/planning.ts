/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Planning, context, summary, delete and undo tools, plus the shared write
 * guard (idempotency by client_key, near-duplicate detection, undo log).
 * Every query runs through the caller's RLS-scoped client and also filters by
 * user_id, so a tool can never touch another account's rows.
 */
import { classifyMuscle as baseClassify, round, setMetrics } from "./core.ts";

/** Hinge lifts are hamstring work even though their names contain "deadlift". */
const classifyMuscle = (name: string) => /romanian|\brdl\b|stiff[- ]leg|good morning/i.test(name) ? "hamstrings" : /hip thrust|glute/i.test(name) ? "glutes" : baseClassify(name);
import { logWorkout, preferences, todayIn, write } from "./writes.ts";

type Client = any;
type Args = Record<string, any>;

const SPLIT = ["push_a", "pull_a", "legs_a", "push_b", "pull_b", "legs_b"] as const;
const SPLIT_NAMES: Record<string, string> = { push_a: "Push A", pull_a: "Pull A", legs_a: "Legs A", push_b: "Push B", pull_b: "Pull B", legs_b: "Legs B" };
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const env = (data: unknown, summary: Args = {}, date: string | null = null) =>
  ({ start_date: date, end_date: date, timezone: "", data, summary, metadata: {} });

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
export const baseExercise = (name: string) => String(name || "").replace(/\s*\((?:set|warm-?up)\s*\d*\)\s*$/i, "").trim();
const needId = (label: string, v: unknown) => { const s = String(v ?? "").trim(); if (!UUID.test(s)) throw new Error(`INVALID_${label.toUpperCase()}`); return s; };
function isoDate(v: unknown, fallback: string) { const s = v == null || v === "" ? fallback : String(v); if (!ISO.test(s) || !Number.isFinite(Date.parse(`${s}T00:00:00Z`))) throw new Error("INVALID_DATE"); return s; }
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

export function sessionKeyOf(sessionKey: unknown, dayName: unknown): string | null {
  const k = String(sessionKey ?? "").toLowerCase();
  if ((SPLIT as readonly string[]).includes(k)) return k;
  const m = /\b(push|pull|legs?)\s*([ab])\b/i.exec(String(dayName ?? ""));
  return m ? `${m[1].toLowerCase().replace(/^leg$/, "legs")}_${m[2].toLowerCase()}` : null;
}

/** Next progression target: top of range reached adds 2.5 kg, otherwise one more rep. */
export function nextTarget(lastWeight: number | null, lastReps: number | null) {
  if (lastReps == null) return { weight_kg: lastWeight, reps: null, rule: "no_reps_logged" };
  if (lastReps >= 10 && lastWeight && lastWeight > 0) return { weight_kg: round(lastWeight + 2.5), reps: 8, rule: "reps_at_10_plus_add_2.5kg" };
  return { weight_kg: lastWeight, reps: lastReps + 1, rule: "add_one_rep" };
}

function equipmentOf(name: string) {
  const n = name.toLowerCase();
  if (/smith/.test(n)) return "smith machine";
  if (/barbell|bench press|deadlift|squat|overhead press|\bohp\b|bb /.test(n)) return "barbell";
  if (/dumbbell|\bdb\b|hammer/.test(n)) return "dumbbell";
  if (/cable|pushdown|pulldown|face pull|crossover/.test(n)) return "cable";
  if (/machine|press machine|leg press|leg extension|leg curl|pec deck|chest press|hack/.test(n)) return "machine";
  if (/pull-?up|chin-?up|dip|push-?up|plank|crunch|hanging/.test(n)) return "bodyweight";
  return "other";
}

/* ----------------------------- context ----------------------------- */

export async function getWorkoutContext(args: Args, db: Client, userId: string, timezone: string) {
  const today = todayIn(timezone);
  const date = isoDate(args.date, today);
  const from28 = addDays(date, -28), from3 = addDays(date, -2), from90 = addDays(date, -90);
  const p = await preferences(db);
  const [workouts, metrics, burns, live, planned] = await Promise.all([
    write<any[]>("ctx_workouts", () => db.from("workouts").select("id,date,day_name,session_key,completed_at,workout_duration_minutes,is_skipped,exercises(name,actual_reps,actual_weight,completed)").eq("user_id", userId).gte("date", from90).lte("date", date).order("date", { ascending: false }).limit(200)),
    write<any[]>("ctx_metrics", () => db.from("daily_metrics").select("date,bodyweight,sleep_hours").eq("user_id", userId).lte("date", date).order("date", { ascending: false }).limit(60)),
    write<any[]>("ctx_burns", () => db.from("calorie_burns").select("id,date,source,activity_type,calories,duration_minutes,distance_km,steps").eq("user_id", userId).gte("date", from3).lte("date", date)),
    write<any[]>("ctx_live", () => db.from("live_workout_sessions").select("id,date,day_name,status,current_exercise,completed_sets,total_sets,elapsed_seconds,started_at,updated_at").eq("user_id", userId).eq("status", "active").gte("updated_at", new Date(Date.now() - 12 * 3600000).toISOString()).order("updated_at", { ascending: false }).limit(1)),
    write<any[]>("ctx_planned", () => db.from("planned_workouts").select("*").eq("user_id", userId).eq("date", date).neq("status", "cancelled")),
  ]);
  const done = (workouts || []).filter(w => !w.is_skipped && (w.exercises || []).some((e: any) => e.completed !== false));
  const recent = done.filter(w => w.date >= from28);

  // Muscle groups: sets in last 28 days and days since last trained.
  const muscles: Record<string, { sets: number; last_trained: string | null; exercises: Set<string> }> = {};
  for (const w of recent) for (const e of w.exercises || []) {
    if (e.completed === false) continue;
    const name = baseExercise(e.name), m = classifyMuscle(name);
    const row = muscles[m] ||= { sets: 0, last_trained: null, exercises: new Set() };
    row.sets += setMetrics(e.actual_reps, e.actual_weight).setCount;
    if (!row.last_trained || w.date > row.last_trained) row.last_trained = w.date;
    row.exercises.add(name);
  }
  const muscleGroups = Object.entries(muscles).filter(([m]) => m !== "unmapped").map(([muscle, v]) => ({
    muscle_group: muscle, sets_last_28_days: v.sets, avg_sets_per_week: round(v.sets / 4, 1),
    last_trained: v.last_trained, days_since_trained: v.last_trained ? daysBetween(v.last_trained, date) : null, exercises: [...v.exercises].slice(0, 8),
  })).sort((a, b) => (b.days_since_trained ?? 99) - (a.days_since_trained ?? 99));

  // Split position.
  const lastBySplit: Record<string, string | null> = Object.fromEntries(SPLIT.map(k => [k, null]));
  for (const w of done) { const k = sessionKeyOf(w.session_key, w.day_name); if (k && !lastBySplit[k]) lastBySplit[k] = w.date; }
  const latestKey = done.map(w => sessionKeyOf(w.session_key, w.day_name)).find(Boolean) ?? null;
  const todayKey = latestKey ? SPLIT[(SPLIT.indexOf(latestKey as any) + 1) % SPLIT.length] : "push_a";
  const overdue = SPLIT.map(k => ({ key: k, last: lastBySplit[k], days: lastBySplit[k] ? daysBetween(lastBySplit[k]!, date) : 999 })).sort((a, b) => b.days - a.days)[0];

  // Progression per exercise from best set of each session (newest first).
  const exposures: Record<string, Array<{ date: string; weight: number; reps: number; e1rm: number }>> = {};
  for (const w of done) {
    const best: Record<string, { weight: number; reps: number; e1rm: number }> = {};
    for (const e of w.exercises || []) {
      if (e.completed === false) continue;
      const name = baseExercise(e.name), reps = num(String(e.actual_reps ?? "").match(/\d+/)?.[0]), weight = num(String(e.actual_weight ?? "").match(/\d+(?:\.\d+)?/)?.[0]) ?? 0;
      if (reps == null) continue;
      const e1rm = weight > 0 ? weight * (1 + reps / 30) : reps;
      if (!best[name] || e1rm > best[name].e1rm) best[name] = { weight, reps, e1rm };
    }
    for (const [name, b] of Object.entries(best)) (exposures[name] ||= []).push({ date: w.date, ...b });
  }
  const progression = Object.entries(exposures).filter(([, x]) => x[0].date >= from28).map(([exercise, x]) => {
    const last = x[0], t = nextTarget(last.weight || null, last.reps);
    const lastThree = x.slice(0, 3);
    const stalled = lastThree.length === 3 && lastThree[0].e1rm <= Math.max(lastThree[1].e1rm, lastThree[2].e1rm);
    return { exercise, muscle_group: classifyMuscle(exercise), last_date: last.date, last_weight_kg: last.weight || null, last_reps: last.reps, next_target_weight_kg: t.weight_kg, next_target_reps: t.reps, rule: t.rule, sessions_logged: x.length, stalled };
  }).sort((a, b) => b.last_date.localeCompare(a.last_date));
  const stalledLifts = progression.filter(x => x.stalled).map(x => ({ exercise: x.exercise, last_weight_kg: x.last_weight_kg, last_reps: x.last_reps, sessions_without_e1rm_gain: 3 }));
  const majors = ["chest", "back", "quads", "hamstrings", "glutes", "shoulders", "side delts", "rear delts", "biceps", "triceps", "calves"];
  const weakPoints = majors.map(m => ({ muscle_group: m, avg_sets_per_week: muscleGroups.find(g => g.muscle_group === m)?.avg_sets_per_week ?? 0 }))
    .filter(x => x.avg_sets_per_week < 8).sort((a, b) => a.avg_sets_per_week - b.avg_sets_per_week).map(x => ({ ...x, reason: "below 8 weekly sets over the last 28 days" }));

  const bw = (metrics || []).find(m => m.bodyweight != null);
  const equipment = [...new Set(done.flatMap(w => (w.exercises || []).map((e: any) => equipmentOf(baseExercise(e.name)))))].filter(e => e !== "other");
  const last3 = [0, 1, 2].map(i => addDays(date, -i)).map(d => {
    const b = (burns || []).filter(x => x.date === d);
    const kind = (k: string) => b.filter(x => x.activity_type === k).map(x => ({ id: x.id, distance_km: x.distance_km, duration_minutes: x.duration_minutes, calories: x.calories, steps: x.steps ?? null }));
    return { date: d, sleep_hours: (metrics || []).find(m => m.date === d)?.sleep_hours ?? null, walking: kind("walking"), cycling: kind("cycling"), running: kind("running"), total_activity_kcal: b.reduce((s, x) => s + (x.calories || 0), 0), total_steps: b.reduce((s, x) => s + (x.steps || 0), 0) || null };
  });

  const data = {
    date,
    profile: {
      goal: p.fitness_goal ?? null, training_focus: p.training_focus ?? null, split: p.training_split ?? "ppl6", weekly_workout_goal: p.weekly_workout_goal ?? null,
      bodyweight_kg: bw?.bodyweight ?? p.initial_weight_kg ?? null, bodyweight_date: bw?.date ?? null, goal_weight_kg: p.weight_goal ?? null,
      targets: { calories: p.daily_calorie_goal ?? null, protein_g: p.daily_protein_goal ?? null, carbs_g: p.daily_carbs_goal ?? null, fat_g: p.daily_fat_goal ?? null, sleep_hours: p.sleep_goal ?? null, water_l: p.daily_water_goal ?? null },
      equipment_used: equipment, weight_convention: "Plate weight in kg excluding the bar",
    },
    split: {
      sequence: SPLIT.map(k => ({ key: k, name: SPLIT_NAMES[k], last_done: lastBySplit[k], days_since: lastBySplit[k] ? daysBetween(lastBySplit[k]!, date) : null })),
      last_completed: latestKey, today: { key: todayKey, name: SPLIT_NAMES[todayKey] },
      most_overdue: { key: overdue.key, name: SPLIT_NAMES[overdue.key], last_done: overdue.last, days_since: overdue.last ? overdue.days : null, differs_from_today: overdue.key !== todayKey },
    },
    last_4_weeks: {
      workouts: recent.length,
      sessions: recent.map(w => ({ workout_id: w.id, date: w.date, name: w.day_name, duration_minutes: w.workout_duration_minutes, sets: (w.exercises || []).filter((e: any) => e.completed !== false).length })),
      by_muscle_group: muscleGroups,
    },
    progression, stalled_lifts: stalledLifts, weak_points: weakPoints,
    recent_days: last3,
    in_progress: live?.[0] ? { live_session_id: live[0].id, date: live[0].date, name: live[0].day_name, current_exercise: live[0].current_exercise, completed_sets: live[0].completed_sets, total_sets: live[0].total_sets, elapsed_seconds: live[0].elapsed_seconds, started_at: live[0].started_at } : null,
    planned_for_date: (planned || []).map(planOut),
  };
  return env(data, { workouts_last_28_days: recent.length, today_split: SPLIT_NAMES[todayKey], most_overdue: SPLIT_NAMES[overdue.key], stalled_lifts: stalledLifts.length, in_progress: !!data.in_progress }, date);
}

/* --------------------------- planned workouts --------------------------- */

const planOut = (r: Args) => ({ id: r.id, date: r.date, title: r.title, duration_minutes: r.duration_minutes, status: r.status, workout_id: r.workout_id, notes: r.notes, exercises: r.exercises, created_at: r.created_at, updated_at: r.updated_at });

function cleanExercises(list: unknown) {
  if (!Array.isArray(list) || !list.length) throw new Error("MISSING_EXERCISES");
  if (list.length > 30) throw new Error("TOO_MANY_EXERCISES");
  return list.map((e: Args, i) => {
    const name = String(e?.name ?? "").trim().slice(0, 120);
    if (!name) throw new Error("MISSING_EXERCISE_NAME");
    const sets = Math.round(Number(e.sets ?? 3)), repMin = Math.round(Number(e.rep_min ?? 8)), repMax = Math.round(Number(e.rep_max ?? e.rep_min ?? 12));
    if (!(sets >= 1 && sets <= 15)) throw new Error("INVALID_SETS");
    if (!(repMin >= 1 && repMax >= repMin && repMax <= 100)) throw new Error("INVALID_REP_RANGE");
    const w = e.target_weight_kg == null ? null : Number(e.target_weight_kg);
    if (w !== null && !(w >= 0 && w <= 600)) throw new Error("INVALID_TARGET_WEIGHT_KG");
    const rest = e.rest_seconds == null ? 90 : Math.round(Number(e.rest_seconds));
    if (!(rest >= 0 && rest <= 900)) throw new Error("INVALID_REST_SECONDS");
    return { name, muscle_group: e.muscle_group ? String(e.muscle_group).slice(0, 40) : classifyMuscle(name), sets, rep_min: repMin, rep_max: repMax, target_weight_kg: w, rest_seconds: rest, notes: e.notes ? String(e.notes).slice(0, 300) : null, order: Number.isFinite(Number(e.order)) ? Number(e.order) : i + 1 };
  }).sort((a, b) => a.order - b.order);
}

function planDate(v: unknown, today: string) {
  const d = isoDate(v, today);
  if (d < addDays(today, -7)) throw new Error("PLAN_DATE_TOO_OLD");
  if (d > addDays(today, 60)) throw new Error("PLAN_DATE_TOO_FAR");
  return d;
}

async function loadPlan(db: Client, userId: string, id: string) {
  const row = await write<any>("plan_lookup", () => db.from("planned_workouts").select("*").eq("id", id).eq("user_id", userId).maybeSingle());
  if (!row) throw new Error("PLANNED_WORKOUT_NOT_FOUND");
  return row;
}

export async function createPlannedWorkout(args: Args, db: Client, userId: string, today: string) {
  const row = {
    user_id: userId, date: planDate(args.date, today),
    title: String(args.title ?? "").trim().slice(0, 80) || (() => { throw new Error("MISSING_TITLE"); })(),
    duration_minutes: args.duration_minutes == null ? null : Math.round(Number(args.duration_minutes)),
    exercises: cleanExercises(args.exercises), notes: args.notes ? String(args.notes).slice(0, 500) : null,
    client_key: args.client_key ? String(args.client_key).slice(0, 64) : null, source: "mcp",
  };
  if (row.duration_minutes !== null && !(row.duration_minutes >= 5 && row.duration_minutes <= 300)) throw new Error("INVALID_DURATION_MINUTES");
  const saved = await write<any>("plan_insert", () => db.from("planned_workouts").insert(row).select().single());
  return env(planOut(saved), { action: "planned_workout_created", appears_in_app: `Today page on ${saved.date} with a Start button` }, saved.date);
}

export async function updatePlannedWorkout(args: Args, db: Client, userId: string, today: string) {
  const id = needId("planned_workout_id", args.id);
  const current = await loadPlan(db, userId, id);
  if (current.status === "completed") throw new Error("PLANNED_WORKOUT_ALREADY_COMPLETED");
  const f = args.fields ?? {};
  const patch: Args = {};
  if (f.date !== undefined) patch.date = planDate(f.date, today);
  if (f.title !== undefined) { patch.title = String(f.title).trim().slice(0, 80); if (!patch.title) throw new Error("MISSING_TITLE"); }
  if (f.duration_minutes !== undefined) patch.duration_minutes = f.duration_minutes === null ? null : Math.round(Number(f.duration_minutes));
  if (f.exercises !== undefined) patch.exercises = cleanExercises(f.exercises);
  if (f.notes !== undefined) patch.notes = f.notes === null ? null : String(f.notes).slice(0, 500);
  if (!Object.keys(patch).length) throw new Error("NO_FIELDS_TO_UPDATE");
  const saved = await write<any>("plan_update", () => db.from("planned_workouts").update(patch).eq("id", id).eq("user_id", userId).select().single());
  return env(planOut(saved), { action: "planned_workout_updated", changed: Object.keys(patch) }, saved.date);
}

export async function deletePlannedWorkout(args: Args, db: Client, userId: string) {
  const id = needId("planned_workout_id", args.id);
  const current = await loadPlan(db, userId, id);
  await write("plan_delete", () => db.from("planned_workouts").delete().eq("id", id).eq("user_id", userId));
  return env(planOut(current), { action: "planned_workout_deleted" }, current.date);
}

export async function completePlannedWorkout(args: Args, db: Client, userId: string, today: string, timezone: string) {
  const id = needId("planned_workout_id", args.id);
  const plan = await loadPlan(db, userId, id);
  const sets: Args[] = Array.isArray(args.sets_actually_done) ? args.sets_actually_done : [];
  if (!sets.length) throw new Error("MISSING_SETS_ACTUALLY_DONE");
  const byName = new Map<string, Args[]>();
  for (const s of sets) {
    const name = String(s?.exercise ?? "").trim();
    if (!name) throw new Error("MISSING_EXERCISE_NAME");
    (byName.get(name) ?? byName.set(name, []).get(name)!).push({ reps: s.reps, weight: s.weight_kg ?? 0 });
  }
  const planned = new Map((plan.exercises || []).map((e: Args) => [e.name.toLowerCase(), e]));
  const exercises = [...byName.entries()].map(([name, list], i) => ({ name, category: i < 2 ? "compound" : "accessory", sets: list, _p: planned.get(name.toLowerCase()) }));
  const workoutId = plan.workout_id && UUID.test(plan.workout_id) ? plan.workout_id : crypto.randomUUID();
  const date = plan.date > today ? today : plan.date;
  const logged = await logWorkout({ date, workout_name: plan.title, duration_minutes: args.duration_minutes ?? plan.duration_minutes ?? 45, start_time: args.start_time, exercises: exercises.map(({ _p, ...e }) => e), client_key: workoutId }, db, userId, today, await preferences(db), timezone);
  await write("plan_complete", () => db.from("planned_workouts").update({ status: "completed", workout_id: workoutId }).eq("id", id).eq("user_id", userId));
  const versus = exercises.map(e => {
    const p = e._p as Args | undefined, top = e.sets.reduce((b: Args, s: Args) => (Number(s.weight) > Number(b.weight) || (Number(s.weight) === Number(b.weight) && Number(s.reps) > Number(b.reps)) ? s : b), e.sets[0]);
    const t = nextTarget(Number(top.weight) || null, num(top.reps));
    return { exercise: e.name, planned: p ? { sets: p.sets, rep_min: p.rep_min, rep_max: p.rep_max, target_weight_kg: p.target_weight_kg } : null, done_sets: e.sets.length, top_set: { weight_kg: Number(top.weight), reps: num(top.reps) }, hit_target: p ? (Number(top.weight) >= Number(p.target_weight_kg ?? 0) && Number(top.reps) >= p.rep_min) : null, next_target_weight_kg: t.weight_kg, next_target_reps: t.reps };
  });
  return env({ planned_workout_id: id, ...(logged as any).data, progression: versus }, { action: "planned_workout_completed" }, date);
}

/* ------------------------------ deletes ------------------------------ */

async function workoutSnapshot(db: Client, userId: string, id: string) {
  const w = await write<any>("workout_snapshot", () => db.from("workouts").select("*").eq("id", id).eq("user_id", userId).maybeSingle());
  if (!w) return null;
  const [ex, burns] = await Promise.all([
    write<any[]>("workout_snapshot_ex", () => db.from("exercises").select("*").eq("workout_id", id)),
    write<any[]>("workout_snapshot_burn", () => db.from("calorie_burns").select("*").eq("user_id", userId).eq("activity_type", `workout:${id}`)),
  ]);
  return { workout: w, exercises: ex || [], burns: burns || [] };
}

async function removeWorkout(db: Client, userId: string, id: string) {
  await write("wd_burn", () => db.from("calorie_burns").delete().eq("user_id", userId).eq("activity_type", `workout:${id}`));
  await write("wd_ex", () => db.from("exercises").delete().eq("workout_id", id));
  await write("wd_sets", () => db.from("exercise_sets").delete().eq("workout_id", id));
  await write("wd_pause", () => db.from("workout_pauses").delete().eq("workout_id", id).eq("user_id", userId));
  await write("wd_check", () => db.from("post_workout_checkins").delete().eq("workout_id", id).eq("user_id", userId));
  await write("wd_plan", () => db.from("planned_workouts").update({ status: "planned", workout_id: null }).eq("workout_id", id).eq("user_id", userId));
  await write("wd_workout", () => db.from("workouts").delete().eq("id", id).eq("user_id", userId));
}

async function restoreWorkout(db: Client, snap: Args) {
  await write("wr_workout", () => db.from("workouts").upsert(snap.workout));
  await write("wr_ex_clear", () => db.from("exercises").delete().eq("workout_id", snap.workout.id));
  if (snap.exercises?.length) await write("wr_ex", () => db.from("exercises").insert(snap.exercises));
  await write("wr_burn_clear", () => db.from("calorie_burns").delete().eq("user_id", snap.workout.user_id).eq("activity_type", `workout:${snap.workout.id}`));
  if (snap.burns?.length) await write("wr_burn", () => db.from("calorie_burns").insert(snap.burns));
}

export async function deleteRecord(name: string, args: Args, db: Client, userId: string) {
  if (name === "delete_workout") {
    const id = needId("workout_id", args.workout_id);
    const snap = await workoutSnapshot(db, userId, id);
    if (!snap) throw new Error("WORKOUT_NOT_FOUND");
    await removeWorkout(db, userId, id);
    return env({ workout_id: id, date: snap.workout.date, name: snap.workout.day_name, sets_removed: snap.exercises.length }, { action: "workout_deleted", undo: "call undo_last_write to restore" }, snap.workout.date);
  }
  const [table, key] = name === "delete_meal" ? ["meals", "meal_id"] : ["calorie_burns", "activity_id"];
  const id = needId(key, args[key]);
  const row = await write<any>("del_lookup", () => db.from(table).select("*").eq("id", id).eq("user_id", userId).maybeSingle());
  if (!row) throw new Error(name === "delete_meal" ? "MEAL_NOT_FOUND" : "ACTIVITY_NOT_FOUND");
  if (table === "calorie_burns" && String(row.activity_type ?? "").startsWith("workout:")) throw new Error("ACTIVITY_IS_WORKOUT_BURN");
  await write("del_row", () => db.from(table).delete().eq("id", id).eq("user_id", userId));
  return env(row, { action: name === "delete_meal" ? "meal_deleted" : "activity_deleted", undo: "call undo_last_write to restore" }, row.date);
}

/* ----------------------------- write guard ----------------------------- */

type LogSpec = { table: string; id: string | null; action: "insert" | "update" | "delete" };
const SPEC: Record<string, (args: Args, data: Args) => LogSpec> = {
  log_meal: (_a, d) => ({ table: "meals", id: d?.id, action: "insert" }),
  update_meal: a => ({ table: "meals", id: a.meal_id, action: "update" }),
  delete_meal: a => ({ table: "meals", id: a.meal_id, action: "delete" }),
  log_water: (_a, d) => ({ table: "water_logs", id: d?.id, action: "insert" }),
  log_workout: (_a, d) => ({ table: "workouts", id: d?.workout_id, action: "insert" }),
  update_workout: a => ({ table: "workouts", id: a.workout_id, action: "update" }),
  delete_workout: a => ({ table: "workouts", id: a.workout_id, action: "delete" }),
  log_activity: (_a, d) => ({ table: "calorie_burns", id: d?.id, action: "insert" }),
  update_activity: (a, d) => ({ table: "calorie_burns", id: a.activity_id ?? d?.id, action: "update" }),
  delete_activity: a => ({ table: "calorie_burns", id: a.activity_id, action: "delete" }),
  log_physique_checkin: (_a, d) => ({ table: "physique_checkins", id: d?.id, action: "insert" }),
  update_physique_checkin: (a, d) => ({ table: "physique_checkins", id: a.checkin_id ?? d?.id, action: "update" }),
  create_planned_workout: (_a, d) => ({ table: "planned_workouts", id: d?.id, action: "insert" }),
  update_planned_workout: a => ({ table: "planned_workouts", id: a.id, action: "update" }),
  delete_planned_workout: a => ({ table: "planned_workouts", id: a.id, action: "delete" }),
  complete_planned_workout: (_a, d) => ({ table: "workouts", id: d?.workout_id, action: "insert" }),
};

async function beforeState(name: string, args: Args, db: Client, userId: string) {
  const probe = SPEC[name]?.(args, {});
  if (!probe || probe.action === "insert" || !probe.id || !UUID.test(String(probe.id))) return null;
  if (probe.table === "workouts") return await workoutSnapshot(db, userId, probe.id);
  return await write<any>("before_state", () => db.from(probe.table).select("*").eq("id", probe.id).eq("user_id", userId).maybeSingle());
}

/** Same item logged moments ago: warn instead of inserting a second copy. */
async function nearDuplicate(name: string, args: Args, db: Client, userId: string, today: string) {
  if (args.allow_duplicate === true || args.client_key) return null;
  const since = new Date(Date.now() - 10 * 60000).toISOString();
  const date = args.date || today;
  if (name === "log_meal" && args.food_name) {
    const rows = await write<any[]>("dup_meal", () => db.from("meals").select("id,date,food_name,calories,created_at").eq("user_id", userId).eq("date", date).ilike("food_name", String(args.food_name).trim()).gte("created_at", since).limit(1));
    return rows?.[0] ?? null;
  }
  if (name === "log_water") {
    const litres = args.litres ?? (args.milliliters != null ? Number(args.milliliters) / 1000 : null);
    const rows = await write<any[]>("dup_water", () => db.from("water_logs").select("id,amount,timestamp").eq("user_id", userId).eq("amount", litres).gte("timestamp", since).limit(1));
    return date === today ? rows?.[0] ?? null : null;
  }
  if (name === "log_activity") {
    const alias: Record<string, string> = { walk: "walking", run: "running", cycle: "cycling", ride: "cycling", bike: "cycling" };
    const kind = alias[String(args.activity_type).toLowerCase()] ?? String(args.activity_type).toLowerCase();
    const rows = await write<any[]>("dup_activity", () => db.from("calorie_burns").select("id,date,activity_type,distance_km,duration_minutes,calories,created_at").eq("user_id", userId).eq("date", date).eq("activity_type", kind).gte("created_at", since).limit(1));
    return rows?.[0] ?? null;
  }
  if (name === "log_physique_checkin" && args.bodyweight != null) {
    const rows = await write<any[]>("dup_weight", () => db.from("physique_checkins").select("id,checkin_date,bodyweight,created_at").eq("user_id", userId).eq("checkin_date", args.checkin_date || today).eq("bodyweight", args.bodyweight).gte("created_at", since).limit(1));
    return rows?.[0] ?? null;
  }
  if (name === "log_workout") {
    const rows = await write<any[]>("dup_workout", () => db.from("workouts").select("id,date,day_name,created_at").eq("user_id", userId).eq("date", date).eq("day_name", String(args.workout_name ?? "")).gte("created_at", since).limit(1));
    return rows?.[0] ?? null;
  }
  return null;
}

export async function guardedWrite(name: string, args: Args, db: Client, userId: string, timezone: string, execute: () => Promise<Args>) {
  const today = todayIn(timezone);
  const clientKey = args.client_key ? String(args.client_key).slice(0, 64) : null;
  if (clientKey) {
    const prior = await write<any[]>("idem_lookup", () => db.from("mcp_write_log").select("result,record_id,created_at,undone_at").eq("user_id", userId).eq("tool_name", name).eq("client_key", clientKey).limit(1));
    if (prior?.[0] && !prior[0].undone_at) return { ...(prior[0].result ?? {}), written: false, duplicate_prevented: true, reason: `client_key "${clientKey}" was already used at ${prior[0].created_at}; the original record is returned and nothing new was saved.` };
  }
  const dup = await nearDuplicate(name, args, db, userId, today);
  if (dup) return { start_date: null, end_date: null, timezone, data: dup, summary: { action: "near_duplicate_skipped" }, metadata: {}, written: false, warning: { code: "NEAR_DUPLICATE", message: "A matching entry was saved in the last 10 minutes, so nothing new was written.", hint: "If this really is a second entry, call again with allow_duplicate: true." }, record: dup };
  const before = await beforeState(name, args, db, userId);
  const result = await execute();
  const spec = SPEC[name]?.(args, result?.data ?? {});
  const out = { ...result, written: true, record: result?.data ?? null };
  if (spec?.id) {
    const row = { user_id: userId, tool_name: name, client_key: clientKey, record_table: spec.table, record_id: String(spec.id), action: spec.action, before_state: before, result: out };
    try {
      if (clientKey) await db.from("mcp_write_log").delete().eq("user_id", userId).eq("tool_name", name).eq("client_key", clientKey).not("undone_at", "is", null);
      await db.from("mcp_write_log").insert(row);
    } catch (e) { console.warn("[mcp] write log failed:", (e as Error).message); }
  }
  return out;
}

export async function undoLastWrite(db: Client, userId: string) {
  const rows = await write<any[]>("undo_lookup", () => db.from("mcp_write_log").select("*").eq("user_id", userId).is("undone_at", null).order("created_at", { ascending: false }).limit(1));
  const last = rows?.[0];
  if (!last) throw new Error("NOTHING_TO_UNDO");
  const { record_table: table, record_id: id, action, before_state: before } = last;
  if (action === "insert") {
    if (table === "workouts") await removeWorkout(db, userId, id);
    else await write("undo_delete", () => db.from(table).delete().eq("id", id).eq("user_id", userId));
  } else {
    if (!before) throw new Error("UNDO_NOT_AVAILABLE");
    if (table === "workouts") await restoreWorkout(db, before);
    else if (action === "update") { const { id: _i, user_id: _u, created_at: _c, ...rest } = before; await write("undo_update", () => db.from(table).update(rest).eq("id", id).eq("user_id", userId)); }
    else await write("undo_restore", () => db.from(table).insert(before));
  }
  await write("undo_mark", () => db.from("mcp_write_log").update({ undone_at: new Date().toISOString() }).eq("id", last.id).eq("user_id", userId));
  return env({ undone_tool: last.tool_name, record_table: table, record_id: id, original_action: action, original_time: last.created_at }, { action: "undone" });
}

/* ----------------------------- day summary ----------------------------- */

export async function getDaySummary(args: Args, db: Client, userId: string, timezone: string) {
  const date = isoDate(args.date, todayIn(timezone));
  const p = await preferences(db);
  const dayStart = new Date(`${date}T00:00:00Z`); // refined below with tz offset
  const offset = (() => { const s = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" }).format(dayStart); const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(s); return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 0; })();
  const startIso = new Date(dayStart.getTime() - offset * 60000).toISOString(), endIso = new Date(dayStart.getTime() - offset * 60000 + 86400000).toISOString();
  const [meals, water, burns, workouts, planned] = await Promise.all([
    write<any[]>("sum_meals", () => db.from("meals").select("id,meal_type,food_name,calories,protein,carbs,fat,fiber,sugar,sodium,caffeine,created_at").eq("user_id", userId).eq("date", date).order("created_at")),
    write<any[]>("sum_water", () => db.from("water_logs").select("id,amount,timestamp").eq("user_id", userId).gte("timestamp", startIso).lt("timestamp", endIso)),
    write<any[]>("sum_burns", () => db.from("calorie_burns").select("id,source,activity_type,calories,duration_minutes,distance_km,steps,created_at").eq("user_id", userId).eq("date", date)),
    write<any[]>("sum_workouts", () => db.from("workouts").select("id,day_name,workout_duration_minutes,estimated_net_kcal,completed_at,is_skipped,exercises(id,completed)").eq("user_id", userId).eq("date", date)),
    write<any[]>("sum_planned", () => db.from("planned_workouts").select("*").eq("user_id", userId).eq("date", date).neq("status", "cancelled")),
  ]);
  const seen = new Map<string, string>();
  const mealRows = (meals || []).map(m => { const k = `${String(m.food_name).toLowerCase().trim()}|${m.calories}`; const dupOf = seen.get(k) ?? null; if (!dupOf) seen.set(k, m.id); return { ...m, possible_duplicate_of: dupOf }; });
  const total = (k: string) => round((meals || []).reduce((s, m) => s + (Number(m[k]) || 0), 0), 1);
  const macro = (k: string, target: unknown) => ({ eaten: total(k), target: target ?? null, remaining: target != null ? round(Number(target) - total(k), 1) : null, percent_of_target: target ? Math.round(total(k) / Number(target) * 100) : null });
  const activities = (burns || []).filter(b => !String(b.activity_type ?? "").startsWith("workout:"));
  const actSeen = new Map<string, string>();
  const activityRows = activities.map(a => { const k = `${a.activity_type}|${a.distance_km}|${a.duration_minutes}`; const dupOf = actSeen.get(k) ?? null; if (!dupOf) actSeen.set(k, a.id); return { ...a, possible_duplicate_of: dupOf }; });
  const wkSeen = new Map<string, string>();
  const workoutRows = (workouts || []).filter(w => !w.is_skipped).map(w => { const k = String(w.day_name).toLowerCase(); const dupOf = wkSeen.get(k) ?? null; if (!dupOf) wkSeen.set(k, w.id); return { workout_id: w.id, name: w.day_name, duration_minutes: w.workout_duration_minutes, sets: (w.exercises || []).filter((e: any) => e.completed !== false).length, estimated_kcal: w.estimated_net_kcal, possible_duplicate_of: dupOf }; });
  const waterMl = Math.round((water || []).reduce((s, w) => s + Number(w.amount || 0), 0) * 1000);
  const data = {
    date,
    nutrition: { calories: macro("calories", p.daily_calorie_goal), protein_g: macro("protein", p.daily_protein_goal), carbs_g: macro("carbs", p.daily_carbs_goal), fat_g: macro("fat", p.daily_fat_goal), fiber_g: macro("fiber", p.daily_fiber_goal), sugar_g: macro("sugar", p.daily_sugar_goal), sodium_mg: macro("sodium", p.daily_sodium_goal), caffeine_mg: macro("caffeine", p.daily_caffeine_goal ?? 250) },
    meals: mealRows,
    water: { total_ml: waterMl, target_ml: p.daily_water_goal != null ? Math.round(Number(p.daily_water_goal) * 1000) : null, percent_of_target: p.daily_water_goal ? Math.round(waterMl / (Number(p.daily_water_goal) * 10)) : null, entries: (water || []).map(w => ({ id: w.id, ml: Math.round(Number(w.amount) * 1000), at: w.timestamp })) },
    activity: { entries: activityRows, total_kcal: activities.reduce((s, a) => s + (a.calories || 0), 0), total_steps: activities.reduce((s, a) => s + (a.steps || 0), 0) || null, workout_burn_kcal: (burns || []).filter(b => String(b.activity_type ?? "").startsWith("workout:")).reduce((s, b) => s + (b.calories || 0), 0) },
    workouts_done: workoutRows,
    workouts_planned: (planned || []).map(planOut),
    duplicates_flagged: mealRows.filter(m => m.possible_duplicate_of).length + activityRows.filter(a => a.possible_duplicate_of).length + workoutRows.filter(w => w.possible_duplicate_of).length,
  };
  return env(data, { calories_eaten: data.nutrition.calories.eaten, protein_g: data.nutrition.protein_g.eaten, water_ml: waterMl, workouts_done: workoutRows.length, workouts_planned: data.workouts_planned.length, duplicates_flagged: data.duplicates_flagged }, date);
}

/* ---------------------------- energy balance ---------------------------- */

/** Per-day maintenance estimate from the app's stored energy model, with the inputs behind it and a completeness flag. */
export async function getEnergyBalance(args: Args, db: Client, userId: string, timezone: string) {
  const today = todayIn(timezone);
  const end = isoDate(args.end_date, today), start = isoDate(args.start_date, addDays(end, -13));
  if (start > end) throw new Error("INVALID_DATE_RANGE");
  if (daysBetween(start, end) > 365) throw new Error("INVALID_DATE_RANGE");
  const [states, meals, burns, metrics] = await Promise.all([
    write<any[]>("eb_states", () => db.from("energy_model_states").select("*").eq("user_id", userId).gte("effective_date", start).lte("effective_date", end)),
    write<any[]>("eb_meals", () => db.from("meals").select("date,calories,protein").eq("user_id", userId).gte("date", start).lte("date", end).limit(5000)),
    write<any[]>("eb_burns", () => db.from("calorie_burns").select("date,source,activity_type,calories").eq("user_id", userId).gte("date", start).lte("date", end).limit(5000)),
    write<any[]>("eb_metrics", () => db.from("daily_metrics").select("date,bodyweight").eq("user_id", userId).gte("date", start).lte("date", end)),
  ]);
  const days: Args[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const s = (states || []).find(x => x.effective_date === d);
    const dayMeals = (meals || []).filter(m => m.date === d);
    const dayBurns = (burns || []).filter(b => b.date === d);
    const weight = (metrics || []).find(m => m.date === d && m.bodyweight != null)?.bodyweight ?? null;
    const intake = dayMeals.reduce((t, m) => t + (m.calories || 0), 0);
    const workoutKcal = dayBurns.filter(b => String(b.activity_type ?? "").startsWith("workout:")).reduce((t, b) => t + (b.calories || 0), 0);
    const cardioKcal = dayBurns.filter(b => !String(b.activity_type ?? "").startsWith("workout:")).reduce((t, b) => t + (b.calories || 0), 0);
    const missing = [!s && "model_estimate", !dayMeals.length && "food_log", weight == null && "weigh_in"].filter(Boolean) as string[];
    const tdee = s ? (s.calibrated_tdee ?? s.predicted_tdee) : null;
    const completeness = !s ? "no_estimate" : !dayMeals.length ? "gaps" : (s.data_quality === "high" && missing.length <= 1 ? "complete" : s.data_quality === "low" ? "low" : "partial");
    days.push({
      date: d,
      maintenance_kcal: tdee, likely_range_kcal: s ? [s.likely_low, s.likely_high] : null,
      intake_kcal: dayMeals.length ? intake : null, net_balance_kcal: tdee != null && dayMeals.length ? intake - tdee : null,
      inputs: s ? {
        weight_used_kg: s.effective_weight_kg, weight_source: s.weight_source, weighed_in_today_kg: weight,
        resting_energy_kcal: s.formula_ree, nonexercise_factor: s.nonexercise_factor, formula_baseline_kcal: s.formula_baseline,
        calibration_adjustment_kcal: s.calibration_adjustment, personal_baseline_kcal: s.personal_baseline,
        activity_used: { workout_kcal: workoutKcal, cardio_kcal: cardioKcal }, predicted_tdee_kcal: s.predicted_tdee, calibrated_tdee_kcal: s.calibrated_tdee,
        weight_observations: s.inputs?.weightObservationCount ?? null, calibration_note: s.inputs?.calibrationReason ?? null,
      } : { weighed_in_today_kg: weight, activity_used: { workout_kcal: workoutKcal, cardio_kcal: cardioKcal } },
      confidence: s?.calibration_confidence ?? null, data_quality: s?.data_quality ?? null, completeness, missing,
    });
  }
  const est = days.filter(d => d.maintenance_kcal != null);
  return {
    start_date: start, end_date: end, timezone, data: days,
    summary: {
      days: days.length, days_with_estimate: est.length, days_missing_food_log: days.filter(d => d.missing.includes("food_log")).length,
      days_missing_weigh_in: days.filter(d => d.missing.includes("weigh_in")).length, days_with_gaps: days.filter(d => d.completeness !== "complete").length,
      average_maintenance_kcal: est.length ? Math.round(est.reduce((t, d) => t + d.maintenance_kcal, 0) / est.length) : null,
    },
    metadata: {
      formula: "resting energy (Mifflin-St Jeor from smoothed weight) x non-exercise factor = formula baseline; + calibration adjustment learned from weight trend vs logged intake = personal baseline; + workout and cardio burn = maintenance (TDEE). calibrated_tdee is preferred over predicted_tdee.",
      completeness_values: { complete: "estimate, food log and good model data", partial: "estimate exists but some inputs are thin", gaps: "no food logged that day", low: "model data quality low", no_estimate: "app has not computed this day" },
    },
  };
}
