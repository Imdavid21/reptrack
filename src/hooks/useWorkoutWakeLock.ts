import { useEffect, useRef, useState } from 'react';

type WakeLockSentinelLike = {
  released?: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: 'release', listener: () => void) => void;
};

export function useWorkoutWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const [supported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  const [enabled, setEnabledState] = useState(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('reptrack-keep-awake') : null;
    return stored == null ? true : stored === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem('reptrack-keep-awake', String(enabled));
  }, [enabled]);

  useEffect(() => {
    let disposed = false;

    const release = async () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) {
        try { await sentinel.release(); } catch { /* wake lock is best effort */ }
      }
    };

    const request = async () => {
      if (!active || !enabled || !supported || document.visibilityState !== 'visible') return;
      if (sentinelRef.current && !sentinelRef.current.released) return;
      try {
        const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
        if (!wakeLock || disposed) return;
        const sentinel = await wakeLock.request('screen');
        if (disposed) {
          await sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener?.('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        });
      } catch {
        // Unsupported/denied wake locks never block training.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request();
      else void release();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void release();
    };
  }, [active, enabled, supported]);

  return {
    supported,
    enabled,
    setEnabled: setEnabledState,
  };
}
