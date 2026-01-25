import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export interface MorningCheckin {
  id: string;
  user_id: string;
  date: string;
  sleep_time: string | null;
  wake_time: string | null;
  sleep_hours: number | null;
  energy_level: number | null;
  heart_rate: number | null;
  oxygen_level: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useMorningCheckin(date?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetDate = date || new Date();
  const dateStr = format(targetDate, 'yyyy-MM-dd');

  const query = useQuery({
    queryKey: ['morningCheckin', user?.id, dateStr],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('morning_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .maybeSingle();

      if (error) throw error;
      return data as MorningCheckin | null;
    },
    enabled: !!user,
  });

  const upsertMutation = useMutation({
    mutationFn: async (checkin: Partial<Omit<MorningCheckin, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('morning_checkins')
        .upsert({
          user_id: user.id,
          date: dateStr,
          ...checkin,
        }, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['morningCheckin'] });
    },
  });

  return {
    checkin: query.data,
    isLoading: query.isLoading,
    upsertCheckin: upsertMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
  };
}

export function useMorningCheckinHistory(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['morningCheckinHistory', user?.id, days],
    queryFn: async () => {
      if (!user) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('morning_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      return data as MorningCheckin[];
    },
    enabled: !!user,
  });
}
