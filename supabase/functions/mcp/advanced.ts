/* eslint-disable @typescript-eslint/no-explicit-any */
import { assertDateRange, average, categorizeDbError, classifyMuscle, round, withRetry } from "./core.ts";

type Client = any;
type Args = Record<string, any>;

async function read<T>(label: string, build: () => any): Promise<T> {
  return await withRetry(label, async () => {
    const { data, error } = await build();
    if (error) {
      const err = new Error(categorizeDbError(error));
      (err as any).code = error?.code;
      (err as any).status = error?.status;
      throw err;
    }
    return data as T;
  });
}

const e1rm = (weight: unknown, reps: unknown) => {
  const w = Number(String(weight ?? "").match(/[\d.]+/)?.[0] || 0);
  const r = Number(String(reps ?? "").match(/\d+/)?.[0] || 0);
  return w > 0 && r > 0 ? w * (1 + Math.min(r, 15) / 30) : 0;
};
const baseExerciseName = (name: unknown) => String(name ?? "").replace(/ \(Set \d+\)$/i, "").trim();
const daysBetween = (a: string, b: string) => Math.max(1, Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000));

async function advancedConfig(db: Client) {
  const [settings, gyms, blocks, experiments] = await Promise.all([
    read<any[]>("advanced_settings", () => db.from("advanced_settings").select("enabled,specialization_muscles,session_volume_modifier,updated_at").limit(1)).catch(() => []),
    read<any[]>("gym_profiles", () => db.from("gym_profiles").select("id,name,bar_weight_kg,plates_kg,is_default").order("is_default", { ascending: false })).catch(() => []),
    read<any[]>("training_blocks", () => db.from("training_blocks").select("id,name,focus,starts_on,ends_on,status").order("starts_on", { ascending: false }).limit(12)).catch(() => []),
    read<any[]>("training_experiments", () => db.from("training_experiments").select("id,name,metric,baseline,target,starts_on,ends_on,status").order("starts_on", { ascending: false }).limit(30)).catch(() => []),
  ]);
  return { settings: settings[0] ?? { enabled: false, specialization_muscles: [], session_volume_modifier: 1 }, gyms, blocks, experiments };
}

async function completedSets(db: Client, start: string, end: string) {
  const workouts = await read<any[]>("advanced_workouts", () => db.from("workouts")
    .select("id,date,day_name,workout_duration_minutes,is_skipped,completion_percent,readiness_band,exercises(name,actual_weight,actual_reps,actual_rir,pain_score,completed,set_kind)")
    .gte("date", start).lte("date", end).not("completed_at", "is", null).order("date"));
  const sets = (workouts || []).flatMap((workout: any) => (workout.exercises || []).filter((set: any) => set.completed !== false).map((set: any) => ({ ...set, name: baseExerciseName(set.name), date: workout.date, workout_id: workout.id, workout_name: workout.day_name })));
  return { workouts: (workouts || []).filter((workout: any) => !workout.is_skipped), sets };
}

function progressionFromSets(sets: any[]) {
  const groups = new Map<string, any[]>();
  for (const set of sets) {
    const exercise = baseExerciseName(set.name);
    const list = groups.get(exercise) ?? [];
    list.push(set);
    groups.set(exercise, list);
  }
  return [...groups.entries()].map(([exercise, rows]) => {
    const dates = [...new Set(rows.map(row => row.date))].sort();
    const latestDate = dates.at(-1);
    const priorDate = dates.at(-2);
    const best = (date: string | undefined) => date ? rows.filter(row => row.date === date).map(row => ({ ...row, estimated_1rm: e1rm(row.actual_weight, row.actual_reps) })).sort((a, b) => b.estimated_1rm - a.estimated_1rm)[0] : null;
    const latest = best(latestDate), prior = best(priorDate);
    const change = latest?.estimated_1rm && prior?.estimated_1rm ? ((latest.estimated_1rm - prior.estimated_1rm) / prior.estimated_1rm) * 100 : null;
    return { exercise, muscle: classifyMuscle(exercise), latest_date: latestDate ?? null, latest_load: latest?.actual_weight ?? null, latest_reps: latest?.actual_reps ?? null, estimated_1rm: latest?.estimated_1rm ? round(latest.estimated_1rm) : null, previous_estimated_1rm: prior?.estimated_1rm ? round(prior.estimated_1rm) : null, change_percent: change == null ? null : round(change), state: change == null ? "learning" : change >= 1.5 ? "progressing" : change <= -3 ? "regressed" : "stable" };
  }).sort((a, b) => String(a.exercise).localeCompare(String(b.exercise)));
}

async function weights(db: Client, start: string, end: string) {
  return await read<any[]>("advanced_bodyweight", () => db.from("daily_metrics").select("date,bodyweight,sleep_hours").gte("date", start).lte("date", end).order("date"));
}

function runwayFromWeights(rows: any[], target: number | null) {
  const valid = rows.filter(row => Number(row.bodyweight) > 0);
  if (!valid.length) return { latest: null, target, weekly_rate: null, eta_weeks: null, status: "insufficient" };
  const trailing = valid.slice(-7); const latest = average(trailing.map(row => Number(row.bodyweight)));
  if (valid.length < 4 || latest == null || target == null) return { latest, target, weekly_rate: null, eta_weeks: null, status: "insufficient" };
  const first = valid[0], last = valid.at(-1); const days = daysBetween(first.date, last.date); const weeklyRate = ((Number(last.bodyweight) - Number(first.bodyweight)) / days) * 7; const remaining = target - latest;
  const aligned = Math.sign(remaining) === Math.sign(weeklyRate) && Math.abs(weeklyRate) >= 0.05;
  return { latest: round(latest), target, weekly_rate: round(weeklyRate), eta_weeks: aligned ? round(Math.abs(remaining / weeklyRate), 1) : null, status: Math.abs(remaining) < 0.2 ? "reached" : aligned ? "on_course" : "off_course" };
}

export const ADVANCED_TOOL_NAMES = [
  "get_advanced_snapshot",
  "get_progression_autopilot",
  "get_cut_control",
  "get_weak_point_radar",
  "get_weekly_coach_review",
  "get_goal_runway",
  "get_advanced_config",
  "list_coach_events",
] as const;

export async function executeAdvancedTool(name: string, args: Args, db: Client, timezone: string) {
  if (name === "get_advanced_config") return { start_date: null, end_date: null, timezone, data: await advancedConfig(db), summary: {}, metadata: { advanced_mode: true } };
  if (name === "list_coach_events") {
    let query = db.from("coach_events").select("id,event_type,event_date,payload,consumed_at,created_at").order("id", { ascending: true }).limit(Math.min(args.limit ?? 50, 100));
    if (!args.include_consumed) query = query.is("consumed_at", null);
    if (Number.isFinite(Number(args.after_id)) && Number(args.after_id) > 0) query = query.gt("id", Number(args.after_id));
    const data = await read<any[]>("coach_events", () => query);
    return { start_date: null, end_date: null, timezone, data, summary: { events: data.length, unconsumed: data.filter((row: any) => !row.consumed_at).length, last_event_id: data.at(-1)?.id ?? null }, metadata: { trigger_queue: true, poll_with_after_id: true } };
  }

  const start = args.start_date, end = args.end_date;
  assertDateRange(start, end, 730);
  const config = await advancedConfig(db);

  if (name === "get_progression_autopilot") {
    const { sets } = await completedSets(db, start, end);
    const data = progressionFromSets(sets);
    return { start_date: start, end_date: end, timezone, data, summary: { progressing: data.filter(row => row.state === "progressing").length, stable: data.filter(row => row.state === "stable").length, regressed: data.filter(row => row.state === "regressed").length }, metadata: { estimated_1rm_formula: "Epley, capped at 15 reps", chatgpt_decides_intervention: true } };
  }

  if (name === "get_weak_point_radar") {
    const { sets } = await completedSets(db, start, end); const counts: Record<string, number> = {};
    sets.forEach((set: any) => { const muscle = classifyMuscle(set.name); counts[muscle] = (counts[muscle] || 0) + 1; });
    const specialization = config.settings?.specialization_muscles || [];
    const data = Object.entries(counts).map(([muscle, set_count]) => ({ muscle, set_count, specialized: specialization.some((item: string) => item.toLowerCase() === muscle.toLowerCase()) })).sort((a, b) => a.set_count - b.set_count);
    return { start_date: start, end_date: end, timezone, data, summary: { specialization, total_sets: sets.length }, metadata: { set_distribution_is_exposure_not_hypertrophy_score: true, chatgpt_decides_weak_point_priority: true } };
  }

  if (name === "get_goal_runway" || name === "get_cut_control") {
    const [rows, prefs] = await Promise.all([weights(db, start, end), read<any[]>("advanced_preferences", () => db.from("user_preferences").select("weight_goal,weight_goal_type,daily_deficit_target,daily_calorie_goal,deficit_mode_enabled").limit(1)).catch(() => [])]);
    const target = prefs[0]?.weight_goal == null ? null : Number(prefs[0].weight_goal); const runway = runwayFromWeights(rows, target);
    if (name === "get_goal_runway") return { start_date: start, end_date: end, timezone, data: rows.filter(row => row.bodyweight != null), summary: runway, metadata: { eta_requires_directionally_aligned_observed_rate: true } };
    const desired = prefs[0]?.daily_deficit_target ? -round((Number(prefs[0].daily_deficit_target) * 7) / 7700, 2) : null;
    return { start_date: start, end_date: end, timezone, data: rows.filter(row => row.bodyweight != null), summary: { ...runway, desired_weekly_rate_from_deficit: desired, deficit_mode_enabled: Boolean(prefs[0]?.deficit_mode_enabled), calorie_target: prefs[0]?.daily_calorie_goal ?? null }, metadata: { nutrition_logs_may_be_incomplete: true, chatgpt_decides_adjustment: true } };
  }

  if (name === "get_weekly_coach_review") {
    const { workouts, sets } = await completedSets(db, start, end); const rows = await weights(db, start, end); const progression = progressionFromSets(sets); const sleep = rows.map(row => Number(row.sleep_hours)).filter(value => value > 0);
    const meals = await read<any[]>("advanced_meals", () => db.from("meals").select("date,calories,protein,food_name,meal_type").gte("date", start).lte("date", end).order("date")).catch(() => []);
    return { start_date: start, end_date: end, timezone, data: { workouts: workouts.map((workout: any) => ({ date: workout.date, name: workout.day_name, duration_minutes: workout.workout_duration_minutes, completion_percent: workout.completion_percent })), progression, bodyweight: rows.filter(row => row.bodyweight != null), nutrition_logs: meals }, summary: { workouts: workouts.length, sets: sets.length, progressing: progression.filter(row => row.state === "progressing").length, regressions: progression.filter(row => row.state === "regressed").length, average_sleep_hours: average(sleep), nutrition_logged_days: new Set(meals.map((row: any) => row.date)).size }, metadata: { coach_review_should_be_generated_by_chatgpt: true, nutrition_completeness_unknown: true } };
  }

  if (name === "get_advanced_snapshot") {
    const [{ workouts, sets }, rows] = await Promise.all([completedSets(db, start, end), weights(db, start, end)]); const progression = progressionFromSets(sets); const counts: Record<string, number> = {}; sets.forEach((set: any) => { const muscle = classifyMuscle(set.name); counts[muscle] = (counts[muscle] || 0) + 1; });
    return { start_date: start, end_date: end, timezone, data: { config, progression, muscle_set_distribution: counts, bodyweight: rows.filter(row => row.bodyweight != null), sleep: rows.filter(row => row.sleep_hours != null), workouts: workouts.map((workout: any) => ({ date: workout.date, name: workout.day_name, duration_minutes: workout.workout_duration_minutes, completion_percent: workout.completion_percent, readiness: workout.readiness_band })) }, summary: { workouts: workouts.length, sets: sets.length, progression: { improving: progression.filter(row => row.state === "progressing").length, stable: progression.filter(row => row.state === "stable").length, regressed: progression.filter(row => row.state === "regressed").length } }, metadata: { designed_for_external_chatgpt_coaching: true } };
  }

  throw new Error("UNKNOWN_ADVANCED_TOOL");
}
