import { useCallback, useEffect, useRef, useState } from 'react';

const LEASE_MS = 6_000;
const HEARTBEAT_MS = 2_000;

interface Lease {
  tabId: string;
  expiresAt: number;
}

function parseLease(value: string | null): Lease | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Lease;
    if (!parsed.tabId || !Number.isFinite(parsed.expiresAt)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useWorkoutTabGuard(userId: string | undefined, active: boolean) {
  const tabId = useRef(crypto.randomUUID());
  const [conflict, setConflict] = useState(false);
  const key = userId ? `reptrack-workout-lease:${userId}` : null;

  const claim = useCallback((force = false) => {
    if (!key || !active) return;
    const now = Date.now();
    const existing = parseLease(window.localStorage.getItem(key));
    const otherOwns = existing && existing.tabId !== tabId.current && existing.expiresAt > now;
    if (otherOwns && !force) {
      setConflict(true);
      return;
    }
    const next: Lease = { tabId: tabId.current, expiresAt: now + LEASE_MS };
    window.localStorage.setItem(key, JSON.stringify(next));
    setConflict(false);
  }, [active, key]);

  const takeOver = useCallback(() => claim(true), [claim]);

  useEffect(() => {
    if (!key || !active) {
      setConflict(false);
      return;
    }

    claim();
    const heartbeat = window.setInterval(() => claim(), HEARTBEAT_MS);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      const lease = parseLease(event.newValue);
      if (!lease || lease.expiresAt <= Date.now()) {
        claim();
        return;
      }
      setConflict(lease.tabId !== tabId.current);
    };
    const onPageHide = () => {
      const lease = parseLease(window.localStorage.getItem(key));
      if (lease?.tabId === tabId.current) window.localStorage.removeItem(key);
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pagehide', onPageHide);
      const lease = parseLease(window.localStorage.getItem(key));
      if (lease?.tabId === tabId.current) window.localStorage.removeItem(key);
    };
  }, [active, claim, key]);

  return { conflict, takeOver };
}
