import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getQueuedItems, removeItem, updateItemRetries, getQueueCount, SyncQueueItem } from '@/lib/offlineSyncQueue';
import { useQueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 5;

type DynamicResult = {
  data: Array<Record<string, unknown>> | null;
  error: { code?: string; message?: string } | null;
};

interface DynamicQuery extends PromiseLike<DynamicResult> {
  select(columns?: string): DynamicQuery;
  insert(payload: Record<string, unknown>): DynamicQuery;
  update(payload: Record<string, unknown>): DynamicQuery;
  delete(): DynamicQuery;
  eq(column: string, value: unknown): DynamicQuery;
  limit(count: number): DynamicQuery;
}

const dynamicSupabase = supabase as unknown as {
  from: (table: string) => DynamicQuery;
};

function errorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return String((error as { code?: unknown }).code ?? '');
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncPromiseRef = useRef<Promise<void> | null>(null);
  const queryClient = useQueryClient();

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

  const refreshCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setPendingCount(count);
    } catch {
      // IndexedDB can be unavailable in hardened/private browser modes.
    }
  }, []);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount, isOnline]);

  /**
   * Some older queued workout children do not carry client-generated row ids.
   * Before replaying them, check the existing natural identity so a request
   * that reached Supabase but lost its response cannot duplicate a set/pause.
   */
  const insertAlreadyLanded = useCallback(async (item: SyncQueueItem): Promise<boolean> => {
    if (item.operation !== 'insert') return false;
    const payload = item.payload;

    if (item.table === 'exercises' && payload.workout_id && payload.name) {
      let query = supabase.from('exercises').select('id').eq('workout_id', String(payload.workout_id)).eq('name', String(payload.name)).limit(1);
      if (payload.sort_order != null) query = query.eq('sort_order', Number(payload.sort_order));
      const { data, error } = await query;
      if (!error && data?.length) return true;
    }

    if (item.table === 'workout_pauses' && payload.workout_id && payload.paused_at) {
      const { data, error } = await dynamicSupabase
        .from('workout_pauses')
        .select('id')
        .eq('workout_id', String(payload.workout_id))
        .eq('paused_at', String(payload.paused_at))
        .limit(1);
      if (!error && data?.length) return true;
    }

    if (item.table === 'habits' && payload.workout_id) {
      const { data, error } = await supabase.from('habits').select('id').eq('workout_id', String(payload.workout_id)).limit(1);
      if (!error && data?.length) return true;
    }

    return false;
  }, []);

  const processItem = useCallback(async (item: SyncQueueItem): Promise<boolean> => {
    try {
      const table = dynamicSupabase.from(item.table);
      if (item.operation === 'insert') {
        if (await insertAlreadyLanded(item)) return true;
        const { error } = await table.insert(item.payload);
        if (error) throw error;
      } else if (item.operation === 'update') {
        const { id: rowId, ...updates } = item.payload;
        const { error } = await table.update(updates).eq('id', rowId);
        if (error) throw error;
      } else if (item.operation === 'delete') {
        const { error } = await table.delete().eq('id', item.payload.id);
        if (error) throw error;
      }
      return true;
    } catch (err: unknown) {
      if (errorCode(err) === '23505') {
        console.warn(`[OfflineSync] Item ${item.id} already present server-side, dropping`);
        return true;
      }
      console.error(`[OfflineSync] Failed to process item ${item.id}:`, err);
      return false;
    }
  }, [insertAlreadyLanded]);

  const processQueue = useCallback(async () => {
    if (syncPromiseRef.current) return syncPromiseRef.current;
    if (!navigator.onLine) return;

    const run = (async () => {
      setIsSyncing(true);
      try {
        const items = await getQueuedItems();
        if (items.length === 0) return;

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

        for (const item of ungrouped) {
          if (item.retries >= MAX_RETRIES) {
            console.error('[OfflineSync] Giving up on queued item after max retries', item.table, item.payload);
            await removeItem(item.id);
            continue;
          }
          const success = await processItem(item);
          if (success) await removeItem(item.id);
          else await updateItemRetries(item.id, item.retries + 1);
        }

        for (const [, group] of groups) {
          const sorted = group.sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0));
          let groupFailed = false;
          for (const item of sorted) {
            if (groupFailed || item.retries >= MAX_RETRIES) {
              if (item.retries >= MAX_RETRIES) await removeItem(item.id);
              continue;
            }
            const success = await processItem(item);
            if (success) await removeItem(item.id);
            else {
              await updateItemRetries(item.id, item.retries + 1);
              groupFailed = true;
            }
          }
        }

        queryClient.invalidateQueries({ queryKey: ['workouts'] });
        queryClient.invalidateQueries({ queryKey: ['habitsData'] });
        queryClient.invalidateQueries({ queryKey: ['personalRecords'] });
        queryClient.invalidateQueries({ queryKey: ['exerciseSets'] });
        queryClient.invalidateQueries({ queryKey: ['lastUsedWeights'] });
        queryClient.invalidateQueries({ queryKey: ['calorie-history'] });
        queryClient.invalidateQueries({ queryKey: ['calorie-burns'] });
        queryClient.invalidateQueries({ queryKey: ['dailyBurns'] });
        queryClient.invalidateQueries({ queryKey: ['meals'] });
        queryClient.invalidateQueries({ queryKey: ['workout-with-exercises'] });
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

  useEffect(() => {
    if (isOnline && pendingCount > 0) void processQueue();
  }, [isOnline, pendingCount, processQueue]);

  return { isOnline, pendingCount, isSyncing, processQueue, refreshCount };
}
