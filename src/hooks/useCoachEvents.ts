/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type CoachEventRow = {
  id: number;
  event_type: string;
  event_date: string;
  payload: Record<string, unknown> | null;
  consumed_at: string | null;
  created_at: string;
};

const table = () => supabase.from('coach_events' as any) as any;

export function useCoachEvents(limit = 50) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['coach-events', user?.id, limit],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<CoachEventRow[]> => {
      if (!user) return [];
      const { data, error } = await table()
        .select('id,event_type,event_date,payload,consumed_at,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as CoachEventRow[];
    },
  });

  const consume = useMutation({
    mutationFn: async (id: number) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await table().update({ consumed_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coach-events', user?.id] }),
  });

  return { events: query.data ?? [], isLoading: query.isLoading, error: query.error, consume };
}
