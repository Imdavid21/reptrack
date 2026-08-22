export const MCP_MODE = "read_write" as const;
export const MCP_VERSION = "1.2.0";

export const APPROVED_TOOLS = [
  "get_fitness_profile", "get_bodyweight_history", "get_workouts",
  "get_exercise_history", "get_training_summary", "get_nutrition",
  "get_sleep", "get_activity", "get_progress_summary", "get_recent_fitness_data",
] as const;

/** Writes are limited to food, water, caffeine, workouts and activities. No deletes exist. */
export const WRITE_TOOLS = [
  "log_meal", "update_meal", "log_water",
  "log_caffeine", "update_caffeine",
  "log_workout", "update_workout",
  "log_activity", "update_activity",
] as const;

export type ToolName = typeof APPROVED_TOOLS[number];
export type WriteToolName = typeof WRITE_TOOLS[number];
export const isApprovedTool = (name: string): name is ToolName =>
  (APPROVED_TOOLS as readonly string[]).includes(name);
export const isWriteTool = (name: string): name is WriteToolName =>
  (WRITE_TOOLS as readonly string[]).includes(name);
export const isPermittedTool = (name: string) => isApprovedTool(name) || isWriteTool(name);

/** Writes may touch any past date or today. There is no backdating limit; future dates stay rejected. */
export function assertWritableDate(date: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("INVALID_DATE");
  const target = Date.parse(`${date}T00:00:00Z`), now = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(target)) throw new Error("INVALID_DATE");
  if (target > now) throw new Error("DATE_IN_FUTURE");
  return date;
}

/** Rejects impossible values before they reach the database. */
export function boundedNumber(label: string, value: unknown, min: number, max: number, optional = true): number | null {
  if (value === undefined || value === null || value === "") {
    if (optional) return null;
    throw new Error(`MISSING_${label.toUpperCase()}`);
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`INVALID_${label.toUpperCase()}`);
  return n;
}


export function parseNumberList(value: unknown): number[] {
  if (typeof value !== "string") return [];
  return (value.match(/-?\d+(?:\.\d+)?/g) || []).map(Number).filter(Number.isFinite);
}

export function setMetrics(repsText: unknown, weightText: unknown) {
  const reps = parseNumberList(repsText);
  const weights = parseNumberList(weightText);
  const setCount = Math.max(reps.length, weights.length, 1);
  const totalReps = reps.reduce((a, b) => a + b, 0);
  const volume = reps.reduce((sum, rep, i) => sum + rep * (weights[i] ?? weights[0] ?? 0), 0);
  const bestEstimated1rm = reps.reduce((best, rep, i) => {
    const load = weights[i] ?? weights[0] ?? 0;
    return Math.max(best, load > 0 && rep > 0 ? load * (1 + rep / 30) : 0);
  }, 0);
  return { setCount, totalReps, volume: round(volume), bestEstimated1rm: round(bestEstimated1rm) };
}

export function round(n: number, places = 2) {
  const factor = 10 ** places;
  return Math.round(n * factor) / factor;
}

export function average(values: Array<number | null | undefined>) {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return valid.length ? round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
}

export function movingAverage7(rows: Array<{ date: string; bodyweight: number }>) {
  return rows.map((row, i) => ({
    ...row,
    moving_average_7d: average(rows.slice(Math.max(0, i - 6), i + 1).map(r => r.bodyweight)),
  }));
}

export function classifyMuscle(name: string): string {
  const n = name.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
  if (/lateral raise|side delt/.test(n)) return "side delts";
  if (/rear delt|reverse fly|face pull|reverse pec/.test(n)) return "rear delts";
  if (/front raise/.test(n)) return "front delts";
  if (/shoulder press|overhead press|military press|arnold press|upright row/.test(n)) return "shoulders";
  if (/tricep|pushdown|skull crusher|close grip bench|diamond push/.test(n)) return "triceps";
  if (/curl|chin up/.test(n)) return "biceps";
  if (/bench|chest|pec deck|fly|push up|dip/.test(n)) return "chest";
  if (/pulldown|pull up|row|deadlift|rack pull/.test(n)) return "back";
  if (/hamstring|leg curl|romanian|rdl|good morning/.test(n)) return "hamstrings";
  if (/hip thrust|glute|kickback/.test(n)) return "glutes";
  if (/calf|calves/.test(n)) return "calves";
  if (/ab|core|crunch|plank|leg raise|knee raise/.test(n)) return "abs/core";
  if (/squat|leg press|leg extension|lunge|split squat/.test(n)) return "quads";
  return "unmapped";
}

export function assertDateRange(start: string, end: string, maxDays = Number.POSITIVE_INFINITY) {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(start) || !pattern.test(end)) throw new Error("INVALID_DATE");
  const a = Date.parse(`${start}T00:00:00Z`), b = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) throw new Error("INVALID_DATE_RANGE");
  if ((b - a) / 86400000 > maxDays) throw new Error("DATE_RANGE_TOO_LARGE");
}

export function localDayBounds(date: string, timezone: string) {
  // Determine the UTC instant corresponding to midnight in an IANA zone without mutating history.
  const guess = new Date(`${date}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(guess).reduce<Record<string, string>>((a, p) => (a[p.type] = p.value, a), {});
  const represented = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offset = represented - guess.getTime();
  const start = new Date(guess.getTime() - offset);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() };
}

/* ---------- resilience helpers ---------- */

const TRANSIENT = /fetch failed|network|timeout|timed out|socket|connection|502|503|504|ECONNRESET|EOF/i;

export function isTransientDbError(error: unknown): boolean {
  const e = error as { code?: string; message?: string; status?: number } | null;
  if (!e) return false;
  if (e.status && e.status >= 500) return true;
  if (e.code && ["57014", "08006", "08003", "53300", "XX000", "PGRST002", "PGRST001"].includes(e.code)) return true;
  return TRANSIENT.test(`${e.message ?? ""}`);
}

/** Stable, non-sensitive category used for audit rows and client-visible errors. */
export function categorizeDbError(error: unknown): string {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return "DATABASE_READ_FAILED";
  if (e.code === "42501") return "PERMISSION_DENIED";
  if (e.code === "PGRST116") return "MULTIPLE_ROWS";
  if (e.code === "57014") return "QUERY_TIMEOUT";
  if (isTransientDbError(e)) return "DATABASE_UNAVAILABLE";
  return e.code ? `DATABASE_READ_FAILED:${e.code}` : "DATABASE_READ_FAILED";
}

/** Retries transient failures with backoff; deterministic failures fail fast. */
export async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === attempts) break;
      console.warn(`[mcp] retrying ${label} (attempt ${attempt})`);
      await new Promise(r => setTimeout(r, 150 * attempt));
    }
  }
  console.error(`[mcp] ${label} failed:`, (lastError as { message?: string })?.message ?? lastError);
  throw lastError;
}

/** Guards MCP clients against oversized payloads that break tool responses. */
export function capPayload<T>(payload: T, maxBytes = 400_000): { payload: T; truncated: boolean } {
  const size = JSON.stringify(payload)?.length ?? 0;
  if (size <= maxBytes) return { payload, truncated: false };
  const any = payload as any;
  if (any && Array.isArray(any.data)) {
    const keep = Math.max(1, Math.floor(any.data.length * (maxBytes / size)));
    return { payload: { ...any, data: any.data.slice(0, keep), metadata: { ...(any.metadata ?? {}), truncated: true, truncated_reason: "payload_size_limit", returned: keep, original_count: any.data.length } }, truncated: true };
  }
  return { payload, truncated: true };
}
