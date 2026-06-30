import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfDay, endOfDay } from 'date-fns';
import { useEffect, useMemo } from 'react';
import { localDateKey } from '@/lib/dateKey';

export interface WaterLog {
  id: string;
  user_id: string;
  timestamp: string;
  amount: number;
  method: 'manual' | 'automation';
}

export function useWaterLogs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Stable per-day boundaries: recomputed only when the local calendar day
  // changes, not on every render. (Previously these were fresh ISO strings on
  // every render, churning the query key + realtime subscription each frame.)
  const dayKey = localDateKey();
  const { todayStart, todayEnd } = useMemo(() => ({
    todayStart: startOfDay(new Date()).toISOString(),
    todayEnd: endOfDay(new Date()).toISOString(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [dayKey]);

  const waterLogsQuery = useQuery({
    queryKey: ['waterLogs', user?.id, dayKey],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', todayStart)
        .lte('timestamp', todayEnd)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data as WaterLog[];
    },
    enabled: !!user,
  });

  // Subscribe to realtime updates for water_logs
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`water-logs-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'water_logs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Check if this log is from today
          const timestamp = (payload.new as WaterLog)?.timestamp || (payload.old as WaterLog)?.timestamp;
          if (timestamp) {
            const logTimestamp = new Date(timestamp);
            const today = new Date();
            if (
              logTimestamp >= startOfDay(today) &&
              logTimestamp <= endOfDay(today)
            ) {
              // Invalidate query to refresh data
              queryClient.invalidateQueries({ queryKey: ['waterLogs'] });
            }
          } else {
            // If no timestamp, still refresh to be safe
            queryClient.invalidateQueries({ queryKey: ['waterLogs'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const addWaterLogMutation = useMutation({
    // `loggedAt` lets the user back-date a log; defaults to now (today).
    mutationFn: async ({ amount = 0.25, loggedAt }: { amount?: number; loggedAt?: Date } = {}) => {
      if (!user) throw new Error('Not authenticated');

      // For a back-date, anchor the timestamp to local noon so day-bucketing
      // (which keys off local date) lands on the intended calendar day.
      const timestamp = loggedAt
        ? new Date(loggedAt.getFullYear(), loggedAt.getMonth(), loggedAt.getDate(), 12, 0, 0).toISOString()
        : undefined;

      const { data, error } = await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          amount,
          method: 'manual',
          ...(timestamp ? { timestamp } : {}),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refresh today's view plus the history/analytics that bucket by date.
      queryClient.invalidateQueries({ queryKey: ['waterLogs'] });
      queryClient.invalidateQueries({ queryKey: ['hydrationData'] });
      queryClient.invalidateQueries({ queryKey: ['bodyOverview'] });
    },
  });

  const totalToday = (waterLogsQuery.data ?? []).reduce(
    (sum, log) => sum + Number(log.amount),
    0
  );

  return {
    waterLogs: waterLogsQuery.data ?? [],
    totalToday,
    isLoading: waterLogsQuery.isLoading,
    addWaterLog: addWaterLogMutation.mutateAsync,
    isAdding: addWaterLogMutation.isPending,
  };
}
