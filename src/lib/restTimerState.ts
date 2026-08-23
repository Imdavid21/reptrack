export interface ActiveRestTimerState {
  endTime: number;
  totalDuration: number;
}

const KEY = 'reptrack-active-rest-timer';
const EVENT = 'reptrack-rest-timer-change';

export function readRestTimerState(): ActiveRestTimerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as ActiveRestTimerState;
    if (!Number.isFinite(parsed.endTime) || !Number.isFinite(parsed.totalDuration)) return null;
    if (parsed.endTime <= Date.now()) return { ...parsed, endTime: parsed.endTime };
    return parsed;
  } catch {
    return null;
  }
}

export function writeRestTimerState(state: ActiveRestTimerState | null) {
  if (typeof window === 'undefined') return;
  if (state) window.localStorage.setItem(KEY, JSON.stringify(state));
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: state }));
}

export function startRestTimer(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const state = { endTime: Date.now() + safe * 1000, totalDuration: safe };
  writeRestTimerState(state);
  return state;
}

export function adjustRestTimer(deltaSeconds: number) {
  const existing = readRestTimerState();
  if (!existing) return null;
  const remaining = Math.max(0, Math.ceil((existing.endTime - Date.now()) / 1000));
  const nextRemaining = Math.max(0, remaining + deltaSeconds);
  const state = { endTime: Date.now() + nextRemaining * 1000, totalDuration: Math.max(existing.totalDuration, nextRemaining) };
  writeRestTimerState(state);
  return state;
}

export function clearRestTimer() {
  writeRestTimerState(null);
}

export function onRestTimerChange(listener: (state: ActiveRestTimerState | null) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<ActiveRestTimerState | null>).detail ?? null);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
