import { format } from 'date-fns';

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
