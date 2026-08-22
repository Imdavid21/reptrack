import { useEffect, useMemo } from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { localDateKey } from '@/lib/dateKey';
import { useAuth } from './useAuth';

export type CaffeineSource =
  | 'coffee'
  | 'espresso'
  | 'tea'
  | 'energy_drink'
  | 'pre_workout'
  | 'soda'
  | 'medication'
  | 'other';

export interface CaffeineLog {
  id: string;
  user_id: string;
  amount_mg: number;
  source: CaffeineSource;
  label: string | null;
  timestamp: string;
  method: 'manual' | 'automation';
  created_at: string;
}

export function useCaffeineLogs(date?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dayKey = localDateKey(date ?? new Date());
  const { dayStart, dayEnd } = useMemo(() => {
    const base = date ?? new Date();
    return {
      dayStart: startOfDay(base).toISOString(),
      dayEnd: endOfDay(base).toISOString(),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  const query = useQuery({
    queryKey: ['caffeineLogs', user?.id, dayKey],
    queryFn: async (): Promise<CaffeineLog[]> => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('caffeine_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', dayStart)
        .lte('timestamp', dayEnd)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CaffeineLog[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`caffeine-logs-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'caffeine_logs', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['caffeineLogs', user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, user]);

  const addMutation = useMutation({
    mutationFn: async ({
      amountMg,
      source = 'other',
      label,
      loggedAt,
    }: {
      amountMg: number;
      source?: CaffeineSource;
      label?: string;
      loggedAt?: Date;
    }) => {
      if (!user) throw new Error('Not authenticated');
      if (!Number.isFinite(amountMg) || amountMg <= 0 || amountMg > 2000) {
        throw new Error('Caffeine amount must be between 1 and 2000 mg');
      }
      const { data, error } = await (supabase as any)
        .from('caffeine_logs')
        .insert({
          user_id: user.id,
          amount_mg: Math.round(amountMg),
          source,
          label: label?.trim() || null,
          timestamp: (loggedAt ?? new Date()).toISOString(),
          method: 'manual',
        })
        .select()
        .single();
      if (error) throw error;
      return data as CaffeineLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caffeineLogs'] });
      queryClient.invalidateQueries({ queryKey: ['caffeineData'] });
      queryClient.invalidateQueries({ queryKey: ['dataroom-caffeine'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('caffeine_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caffeineLogs'] });
      queryClient.invalidateQueries({ queryKey: ['caffeineData'] });
      queryClient.invalidateQueries({ queryKey: ['dataroom-caffeine'] });
    },
  });

  const logs = query.data ?? [];
  const totalToday = logs.reduce((sum, log) => sum + Number(log.amount_mg || 0), 0);
  const lastIntakeAt = logs[0]?.timestamp ?? null;

  return {
    caffeineLogs: logs,
    totalToday,
    lastIntakeAt,
    isLoading: query.isLoading,
    addCaffeineLog: addMutation.mutateAsync,
    deleteCaffeineLog: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
