/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Live-session MCP surface: lets an assistant read the workout that is happening
 * right now and leave in-session cues (triggers) or a coach note. Nothing here
 * mutates historical workout rows; the live table is a mirror of the client's
 * in-progress session.
 */
import { categorizeDbError, withRetry } from "./core.ts";

type Client = any;
type Args = Record<string, any>;

export const CONDITION_TYPES = [
  "exercise_started", "weight_at_least", "reps_at_least",
  "elapsed_minutes", "completed_sets", "session_volume",
] as const;
export type ConditionType = typeof CONDITION_TYPES[number];

const COMPARATORS = ["gte", "lte"] as const;

async function run<T>(label: string, build: () => any): Promise<T> {
  return await withRetry(label, async () => {
    const { data, error } = await build();
    if (error) {
      const detail = [(error as any).message, (error as any).details].filter(Boolean).join(" | ").slice(0, 200);
      throw new Error(`${categorizeDbError(error)}${detail ? `: ${detail}` : ""}`);
    }
    return data as T;
  });
}

/** Sessions older than 8 hours are treated as abandoned, never as "live". */
const STALE_MS = 8 * 3_600_000;

function isLive(row: Args | null): boolean {
  if (!row || row.status !== "active") return false;
  const updated = Date.parse(row.updated_at ?? row.started_at ?? "");
  return Number.isFinite(updated) ? Date.now() - updated < STALE_MS : true;
}

async function liveRow(db: Client): Promise<Args | null> {
  const rows = await run<any[]>("live_session", () => db.from("live_workout_sessions").select("*").order("updated_at", { ascending: false }).limit(1));
  return rows?.[0] ?? null;
}

async function triggerRows(db: Client, statuses: string[]): Promise<Args[]> {
  return (await run<any[]>("workout_triggers", () => db.from("workout_triggers").select("*").in("status", statuses).order("created_at", { ascending: false }).limit(100))) || [];
}

const envelope = (data: unknown, summary: unknown, metadata: Args = {}) =>
  ({ start_date: null, end_date: null, timezone: "", data, summary, metadata });

export async function getLiveWorkout(db: Client) {
  const row = await liveRow(db);
  const live = isLive(row);
  if (!live) {
    return envelope(null, { live: false, reason: row ? "no active session" : "no session recorded" }, { stale_session: !!row });
  }
  const exercises = Array.isArray(row!.exercises) ? row!.exercises : [];
  const triggers = await triggerRows(db, ["active"]).catch(() => []);
  return envelope({
    session_id: row!.id,
    date: row!.date,
    workout_name: row!.day_name ?? row!.day,
    status: row!.status,
    started_at: row!.started_at,
    elapsed_minutes: Math.round((row!.elapsed_seconds || 0) / 60),
    current_exercise: row!.current_exercise,
    current_exercise_index: row!.current_exercise_index,
    current_set_index: row!.current_set_index,
    completed_sets: row!.completed_sets,
    total_sets: row!.total_sets,
    total_volume: row!.total_volume,
    coach_note: row!.coach_note,
    exercises,
  }, {
    live: true,
    progress_percent: row!.total_sets ? Math.round((row!.completed_sets / row!.total_sets) * 100) : 0,
    active_triggers: triggers.length,
  }, { updated_at: row!.updated_at });
}

export async function listWorkoutTriggers(db: Client, args: Args) {
  const statuses = args?.include_fired ? ["active", "fired", "acknowledged", "cancelled"] : ["active"];
  const rows = await triggerRows(db, statuses);
  return envelope(rows.map(r => ({
    trigger_id: r.id, condition_type: r.condition_type, exercise_name: r.exercise_name,
    comparator: r.comparator, threshold: r.threshold, message: r.message, status: r.status,
    repeat_mode: r.repeat_mode, fired_at: r.fired_at, fired_count: r.fired_count, expires_at: r.expires_at,
  })), { total: rows.length, active: rows.filter(r => r.status === "active").length });
}

function requireCondition(value: unknown): ConditionType {
  const s = String(value ?? "").toLowerCase().trim();
  if ((CONDITION_TYPES as readonly string[]).includes(s)) return s as ConditionType;
  throw new Error("INVALID_CONDITION_TYPE");
}

export async function setWorkoutTrigger(db: Client, userId: string, args: Args) {
  const condition_type = requireCondition(args.condition_type);
  const message = String(args.message ?? "").trim().slice(0, 300);
  if (!message) throw new Error("MISSING_MESSAGE");
  const needsThreshold = condition_type !== "exercise_started";
  const threshold = args.threshold === undefined || args.threshold === null ? null : Number(args.threshold);
  if (needsThreshold && (!Number.isFinite(threshold as number) || (threshold as number) < 0)) throw new Error("MISSING_THRESHOLD");
  if (condition_type === "exercise_started" && !args.exercise_name) throw new Error("MISSING_EXERCISE_NAME");
  const comparator = COMPARATORS.includes(String(args.comparator ?? "gte") as any) ? String(args.comparator ?? "gte") : "gte";
  const payload = {
    user_id: userId, source: "mcp", condition_type,
    exercise_name: args.exercise_name ? String(args.exercise_name).slice(0, 120) : null,
    threshold, comparator, message,
    repeat_mode: args.repeat_mode === "always" ? "always" : "once",
    status: "active",
    expires_at: args.expires_in_hours ? new Date(Date.now() + Math.min(72, Math.max(1, Number(args.expires_in_hours))) * 3_600_000).toISOString() : null,
  };
  const row = await run<any>("trigger_insert", () => db.from("workout_triggers").insert(payload).select().single());
  return envelope({ trigger_id: row.id, ...payload, user_id: undefined }, { action: "trigger_created" });
}

export async function cancelWorkoutTrigger(db: Client, userId: string, args: Args) {
  const id = String(args.trigger_id ?? "").trim();
  if (!id) throw new Error("MISSING_TRIGGER_ID");
  const row = await run<any>("trigger_cancel", () => db.from("workout_triggers").update({ status: "cancelled" }).eq("id", id).eq("user_id", userId).select().maybeSingle());
  if (!row) throw new Error("TRIGGER_NOT_FOUND");
  return envelope({ trigger_id: row.id, status: row.status }, { action: "trigger_cancelled" });
}

export async function sendCoachNote(db: Client, args: Args) {
  const note = String(args.note ?? "").trim().slice(0, 500);
  if (!note) throw new Error("MISSING_NOTE");
  const row = await liveRow(db);
  if (!isLive(row)) throw new Error("NO_ACTIVE_SESSION");
  const saved = await run<any>("coach_note", () => db.from("live_workout_sessions").update({ coach_note: note, coach_note_at: new Date().toISOString() }).eq("id", row!.id).select().single());
  return envelope({ session_id: saved.id, coach_note: saved.coach_note }, { action: "coach_note_sent" });
}
