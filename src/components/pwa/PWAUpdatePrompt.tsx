import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isResumableDraft, useDraftWorkout } from '@/hooks/useDraftWorkout';

export function PWAUpdatePrompt() {
  const { draft } = useDraftWorkout();
  const intervalRef = useRef<number | null>(null);
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => registration.update().catch(() => {});
      check();
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(check, 5 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  }, []);

  if (!isStandalone || !needRefresh) return null;

  const activeWorkout = isResumableDraft(draft);
  const handleUpdate = () => {
    if (activeWorkout) return;
    void updateServiceWorker(true);
  };

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[70] md:left-auto md:right-8 md:w-80 md:bottom-20" role="status">
      <div className="relative rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur">
        <button onClick={() => setNeedRefresh(false)} aria-label="Dismiss update" className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><X size={16}/></button>
        <div className="pr-9">
          <div className="flex items-center gap-2"><RefreshCw size={17}/><h3 className="text-sm font-semibold">Update ready</h3></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{activeWorkout ? 'Finish or pause your workout first. RepTrack will not refresh over an active session.' : 'A new version is ready to load.'}</p>
        </div>
        {activeWorkout ? (
          <Button size="sm" variant="secondary" onClick={() => setNeedRefresh(false)} className="mt-3 w-full">Later</Button>
        ) : (
          <Button size="sm" onClick={handleUpdate} className="mt-3 w-full">Update now</Button>
        )}
      </div>
    </div>
  );
}
