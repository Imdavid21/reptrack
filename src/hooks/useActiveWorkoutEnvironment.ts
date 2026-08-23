import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './useAuth';

const TAB_KEY = 'reptrack-active-workout-tab';
const STALE_MS = 10_000;

interface ActiveTabLease {
  tabId: string;
  updatedAt: number;
}

function parseLease(raw: string | null): ActiveTabLease | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as ActiveTabLease;
    if (!value?.tabId || !Number.isFinite(value.updatedAt)) return null;
    return value;
  } catch {
    return null;
  }
}

function readDraft(userId?: string) {
  if (!userId) return null;
  try {
    const raw = window.localStorage.getItem(`fittrack_draft_workout_${userId}`);
    return raw ? JSON.parse(raw) as {
      workoutStartTime?: string;
      elapsedSeconds?: number;
      pausedSeconds?: number;
      pauseStartedAt?: string;
      step?: string;
    } : null;
  } catch {
    return null;
  }
}

export function formatWorkoutElapsed(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Browser/device-only coordination for the active logger. This never writes
 * fitness history or persistent workout semantics. It only exposes elapsed
 * context and warns when another tab appears to be editing the same local
 * active-workout state.
 */
export function useActiveWorkoutEnvironment() {
  const { user } = useAuth();
  const tabIdRef = useRef(typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [otherTabActive, setOtherTabActive] = useState(false);

  useEffect(() => {
    if (!user) return;
    const tickClock = () => {
      const draft = readDraft(user.id);
      if (!draft) return;
      const started = draft.workoutStartTime ? new Date(draft.workoutStartTime).getTime() : NaN;
      if (!Number.isFinite(started)) {
        setElapsedSeconds(Number(draft.elapsedSeconds || 0));
        return;
      }
      const paused = Number(draft.pausedSeconds || 0);
      const currentPause = draft.pauseStartedAt ? Math.max(0, (Date.now() - new Date(draft.pauseStartedAt).getTime()) / 1000) : 0;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000 - paused - currentPause)));
    };
    tickClock();
    const interval = window.setInterval(tickClock, 1000);
    return () => window.clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const tabId = tabIdRef.current;
    const checkAndClaim = () => {
      const existing = parseLease(window.localStorage.getItem(TAB_KEY));
      const aliveOther = !!existing && existing.tabId !== tabId && Date.now() - existing.updatedAt < STALE_MS;
      setOtherTabActive(aliveOther);
      // Do not overwrite a healthy lease owned by another tab. The second tab
      // remains read/edit-capable but gets a clear conflict warning instead of
      // silently becoming the authoritative writer.
      if (!aliveOther) {
        window.localStorage.setItem(TAB_KEY, JSON.stringify({ tabId, updatedAt: Date.now() } satisfies ActiveTabLease));
      }
    };
    checkAndClaim();
    const interval = window.setInterval(checkAndClaim, 3000);
    const onStorage = (event: StorageEvent) => { if (event.key === TAB_KEY) checkAndClaim(); };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', onStorage);
      const existing = parseLease(window.localStorage.getItem(TAB_KEY));
      if (existing?.tabId === tabId) window.localStorage.removeItem(TAB_KEY);
    };
  }, []);

  return useMemo(() => ({
    elapsedSeconds,
    elapsedLabel: formatWorkoutElapsed(elapsedSeconds),
    unusuallyLong: elapsedSeconds >= 4 * 60 * 60,
    otherTabActive,
  }), [elapsedSeconds, otherTabActive]);
}
