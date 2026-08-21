import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getQueuedItems, removeItem, updateItemRetries, getQueueCount, SyncQueueItem } from '@/lib/offlineSyncQueue';
import { useQueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 5;

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  // Holds the in-flight sync promise. Acts as a mutex so a network flap
  // (offline→online→offline) can't start two concurrent replays that both
  // see "not syncing" and double-insert the same queued workout.
  const syncPromiseRef = useRef<Promise<void> | null>(null);
  const queryClient = useQueryClient();

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Update pending count - called after queue changes, not on a timer
  const refreshCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available
    }
  }, []);

  // Refresh once on mount and when connectivity changes (no polling)
  useEffect(() => {
    refreshCount();
  }, [refreshCount, isOnline]);

  // Process a single queue item
  const processItem = useCallback(async (item: SyncQueueItem): Promise<boolean> => {
    try {
      if (item.operation === 'insert') {
        const { error } = await supabase
          .from(item.table as any)
          .insert(item.payload as any);
        if (error) throw error;
      } else if (item.operation === 'update') {
        const { id: rowId, ...updates } = item.payload;
        const { error } = await supabase
          .from(item.table as any)
          .update(updates as any)
          .eq('id', rowId as string);
        if (error) throw error;
      } else if (item.operation === 'delete') {
        const { error } = await supabase
          .from(item.table as any)
          .delete()
          .eq('id', item.payload.id as string);
        if (error) throw error;
      }
      return true;
    } catch (err: any) {
      // A duplicate key means the row already landed (e.g. the original request
      // succeeded but the response never arrived). Replaying it is a no-op, so
      // treat it as done instead of retrying it five more times.
      if (err?.code === '23505') {
        console.warn(`[OfflineSync] Item ${item.id} already present server-side, dropping`);
        return true;
      }
      console.error(`[OfflineSync] Failed to process item ${item.id}:`, err);
      return false;
    }
  }, []);

  // Process all queued items. Guarded by a single in-flight promise so
  // overlapping triggers (online event + pendingCount effect) coalesce into
  // one run instead of racing and producing duplicate inserts.
  const processQueue = useCallback(async () => {
    if (syncPromiseRef.current) return syncPromiseRef.current;
    if (!navigator.onLine) return;

    const run = (async () => {
    setIsSyncing(true);

    try {
      const items = await getQueuedItems();
      if (items.length === 0) {
        return;
      }

      // Group items by groupId and process groups in order
      const groups = new Map<string, SyncQueueItem[]>();
      const ungrouped: SyncQueueItem[] = [];

      for (const item of items) {
        if (item.groupId) {
          const group = groups.get(item.groupId) || [];
          group.push(item);
          groups.set(item.groupId, group);
        } else {
          ungrouped.push(item);
        }
      }

      // Process ungrouped items
      for (const item of ungrouped) {
        if (item.retries >= MAX_RETRIES) {
          console.error('[OfflineSync] Giving up on queued item after max retries', item.table, item.payload);
          await removeItem(item.id);
          continue;
        }
        const success = await processItem(item);
        if (success) {
          await removeItem(item.id);
        } else {
          await updateItemRetries(item.id, item.retries + 1);
        }
      }

      // Process grouped items in order
      for (const [, group] of groups) {
        const sorted = group.sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0));
        let groupFailed = false;

        for (const item of sorted) {
          if (groupFailed || item.retries >= MAX_RETRIES) {
            if (item.retries >= MAX_RETRIES) await removeItem(item.id);
            continue;
          }
          const success = await processItem(item);
          if (success) {
            await removeItem(item.id);
          } else {
            await updateItemRetries(item.id, item.retries + 1);
            groupFailed = true; // Stop processing rest of group
          }
        }
      }

      // Invalidate relevant queries after sync
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['habitsData'] });
      queryClient.invalidateQueries({ queryKey: ['personalRecords'] });
      // 'exerciseSets' is the real key behind volume/progression/muscle-
      // balance views - 'volumeData'/'exerciseProgression' match no actual
      // query anywhere in the app (see the same dead keys in useWorkouts.ts).
      queryClient.invalidateQueries({ queryKey: ['exerciseSets'] });
      queryClient.invalidateQueries({ queryKey: ['lastUsedWeights'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-history'] });
      queryClient.invalidateQueries({ queryKey: ['calorie-burns'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBurns'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    } catch (err) {
      console.error('[OfflineSync] Queue processing error:', err);
    } finally {
      await refreshCount();
      setIsSyncing(false);
    }
    })();

    syncPromiseRef.current = run;
    try {
      await run;
    } finally {
      syncPromiseRef.current = null;
    }
  }, [processItem, queryClient, refreshCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      processQueue();
    }
  }, [isOnline, pendingCount, processQueue]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    processQueue,
    refreshCount,
  };
}
