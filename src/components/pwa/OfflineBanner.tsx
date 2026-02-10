import { WifiOff, RefreshCw, CloudOff, Check } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, processQueue } = useOfflineSync();

  // Fully online with nothing pending — don't show anything
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-all duration-300',
        !isOnline
          ? 'bg-destructive text-destructive-foreground'
          : isSyncing
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline — changes saved locally{pendingCount > 0 ? ` (${pendingCount} pending)` : ''}</span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Syncing {pendingCount} pending changes…</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          <span>{pendingCount} changes pending</span>
          <button
            onClick={() => processQueue()}
            className="ml-1 underline hover:no-underline"
          >
            Sync now
          </button>
        </>
      ) : null}
    </div>
  );
}
