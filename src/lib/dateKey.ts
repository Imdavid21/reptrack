import { format, parseISO } from 'date-fns';

/**
 * Returns a YYYY-MM-DD key in the user's LOCAL timezone.
 *
 * Do NOT use `new Date().toISOString().split('T')[0]` for date keys — that is
 * UTC, so anyone west of GMT logging in the evening lands on the next calendar
 * day, silently corrupting streaks, "today" views, and every dated aggregate.
 * Always build day keys from local time with this helper.
 */
export function localDateKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/** Convenience: today's local date key. */
export function todayKey(): string {
  return localDateKey(new Date());
}

/**
 * Parses a stored `YYYY-MM-DD` day key back into a Date at LOCAL midnight.
 *
 * Do NOT use `new Date('2026-07-13')` for this — JS parses a date-only string as
 * UTC midnight, which is the *previous* calendar day for anyone west of GMT.
 * Comparing that against local week/month boundaries (startOfWeek, getMonth,
 * differenceInDays) silently drops or misattributes entries. `parseISO` treats a
 * date-only string as local time, which is what every dated read wants.
 */
export function parseDateKey(dayKey: string): Date {
  return parseISO(dayKey);
}
