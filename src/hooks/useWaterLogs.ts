import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfDay, endOfDay } from 'date-fns';
import { useEffect, useMemo } from 'react';
import { localDateKey } from '@/lib/dateKey';

export interface WaterLog { id: string; user_id: string; timestamp: string; amount: number; method: 'manual' | 'automation'; }

export function useWaterLogs(date?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dayKey = localDateKey(date ?? new Date());
  const { dayStart, dayEnd } = useMemo(() => {
    const base = date ?? new Date();
    return { dayStart: startOfDay(base).toISOString(), dayEnd: endOfDay(base).toISOString() };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  const waterLogsQuery = useQuery({
    queryKey: ['waterLogs', user?.id, dayKey],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('water_logs').select('*').eq('user_id', user.id).gte('timestamp', dayStart).lte('timestamp', dayEnd).order('timestamp', { ascending: false });
      if (error) throw error;
      return data as WaterLog[];
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`water-logs-realtime-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'water_logs', filter: `user_id=eq.${user.id}` }, () => {
      // Water can be written by another tab, the extension, or MCP and can be
      // back-dated. Invalidate all date-scoped water caches plus Dataroom
      // hydration instead of refreshing only today's dashboard row.
      queryClient.invalidateQueries({ queryKey: ['waterLogs'] });
      queryClient.invalidateQueries({ queryKey: ['hydrationData'] });
      queryClient.invalidateQueries({ queryKey: ['bodyOverview'] });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const addWaterLogMutation = useMutation({
    mutationFn: async ({ amount = 0.25, loggedAt }: { amount?: number; loggedAt?: Date } = {}) => {
      if (!user) throw new Error('Not authenticated');
      const timestamp = loggedAt ? new Date(loggedAt.getFullYear(), loggedAt.getMonth(), loggedAt.getDate(), 12, 0, 0).toISOString() : undefined;
      const { data, error } = await supabase.from('water_logs').insert({ user_id: user.id, amount, method: 'manual', ...(timestamp ? { timestamp } : {}) }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waterLogs'] });
      queryClient.invalidateQueries({ queryKey: ['hydrationData'] });
      queryClient.invalidateQueries({ queryKey: ['bodyOverview'] });
    },
  });

  const totalToday = (waterLogsQuery.data ?? []).reduce((sum, log) => sum + Number(log.amount), 0);
  return { waterLogs: waterLogsQuery.data ?? [], totalToday, isLoading: waterLogsQuery.isLoading, isFetching: waterLogsQuery.isFetching, addWaterLog: addWaterLogMutation.mutateAsync, isAdding: addWaterLogMutation.isPending };
}
