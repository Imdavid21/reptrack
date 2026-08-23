import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, processQueue } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex min-h-10 items-center justify-center gap-2 border-b border-border px-4 py-2 text-xs font-medium pt-[calc(0.5rem+env(safe-area-inset-top))]',
        isSyncing ? 'bg-foreground text-background' : 'bg-card text-foreground'
      )}
    >
      {!isOnline ? <>
        <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Offline. Active workout state stays on this device{pendingCount > 0 ? ` · ${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} waiting to sync` : ''}.</span>
      </> : isSyncing ? <>
        <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        <span>Syncing {pendingCount} pending {pendingCount === 1 ? 'change' : 'changes'}…</span>
      </> : <>
        <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{pendingCount} {pendingCount === 1 ? 'change is' : 'changes are'} waiting to sync.</span>
        <button onClick={() => void processQueue()} className="ml-1 min-h-8 font-semibold underline underline-offset-4">Sync now</button>
      </>}
    </div>
  );
}
