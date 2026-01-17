import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfDay, endOfDay } from 'date-fns';
import { useEffect } from 'react';

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

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  const waterLogsQuery = useQuery({
    queryKey: ['waterLogs', user?.id, todayStart],
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
          console.log('Water log realtime update:', payload);
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
      .subscribe((status) => {
        console.log('Water logs realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, todayStart]);

  const addWaterLogMutation = useMutation({
    mutationFn: async (amount: number = 0.25) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('water_logs')
        .insert({
          user_id: user.id,
          amount,
          method: 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waterLogs'] });
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
