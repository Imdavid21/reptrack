import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getQueuedItems, removeItem, updateItemRetries, getQueueCount, SyncQueueItem } from '@/lib/offlineSyncQueue';
import { useQueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 5;

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);
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

  // Update pending count — called after queue changes, not on a timer
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
    } catch (err) {
      console.error(`[OfflineSync] Failed to process item ${item.id}:`, err);
      return false;
    }
  }, []);

  // Process all queued items
  const processQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const items = await getQueuedItems();
      if (items.length === 0) {
        setIsSyncing(false);
        syncingRef.current = false;
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
    } catch (err) {
      console.error('[OfflineSync] Queue processing error:', err);
    } finally {
      await refreshCount();
      setIsSyncing(false);
      syncingRef.current = false;
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
