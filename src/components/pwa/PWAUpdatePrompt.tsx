import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';

export function PWAUpdatePrompt() {
  const { resumable } = useDraftWorkout();
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => registration.update().catch(() => {});
      void check();
      const onVis = () => { if (document.visibilityState === 'visible') void check(); };
      document.addEventListener('visibilitychange', onVis);
      const interval = window.setInterval(check, 5 * 60 * 1000);
      // The service-worker library owns registration lifetime. This interval is
      // deliberately page-scoped and will be released when the page unloads.
      window.addEventListener('pagehide', () => window.clearInterval(interval), { once: true });
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  if (!isStandalone || !needRefresh || resumable) return null;

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 md:left-auto md:right-8 md:w-80 md:bottom-20">
      <div className="bg-card/95 backdrop-blur-sm border border-border shadow-xl rounded-2xl p-4 relative">
        <button onClick={() => setNeedRefresh(false)} aria-label="Dismiss update" className="absolute top-2 right-2 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted"><X size={16} /></button>
        <div className="flex items-center gap-3 mb-3 pr-8"><div className="bg-muted p-2 rounded-xl"><RefreshCw size={18} /></div><div><h3 className="font-bold text-sm">Update ready</h3><p className="text-xs text-muted-foreground">Install when you are between sessions.</p></div></div>
        <Button size="sm" onClick={() => updateServiceWorker(true)} className="w-full">Update RepTrack</Button>
      </div>
    </div>
  );
}
