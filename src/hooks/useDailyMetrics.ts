import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export interface DailyMetric { id: string; user_id: string; date: string; pullups: number; notes: string | null; bodyweight: number | null; sleep_hours: number | null; }
export interface MetricsAnalytics { dataPoints: DailyMetric[]; totals: { totalPullups: number; avgSleep: number | null; avgBodyweight: number | null; daysWithData: number; daysTracked: number; }; }
export interface DateRangeFilter { from: Date; to: Date; }

export function useDailyMetrics(dateRange?: DateRangeFilter) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fromKey = dateRange ? format(dateRange.from, 'yyyy-MM-dd') : '1900-01-01';
  const toKey = dateRange ? format(dateRange.to, 'yyyy-MM-dd') : '2100-01-01';

  const query = useQuery({
    queryKey: ['dailyMetrics', user?.id, fromKey, toKey],
    queryFn: async (): Promise<MetricsAnalytics> => {
      if (!user) return { dataPoints: [], totals: { totalPullups: 0, avgSleep: null, avgBodyweight: null, daysWithData: 0, daysTracked: 0 } };
      const { data, error } = await supabase.from('daily_metrics').select('id, date, pullups, notes, bodyweight, sleep_hours').eq('user_id', user.id).gte('date', dateRange ? fromKey : '1900-01-01').lte('date', dateRange ? toKey : '2100-01-01').order('date', { ascending: true });
      if (error) throw error;
      const dataPoints: DailyMetric[] = (data || []).map(d => ({ id: d.id, user_id: user.id, date: d.date, pullups: d.pullups ?? 0, notes: d.notes ?? null, bodyweight: d.bodyweight ?? null, sleep_hours: d.sleep_hours ?? null }));
      const withSleep = dataPoints.filter(d => d.sleep_hours !== null && d.sleep_hours > 0);
      const withWeight = dataPoints.filter(d => d.bodyweight !== null && d.bodyweight > 0);
      const withAnyData = dataPoints.filter(d => d.sleep_hours !== null || d.bodyweight !== null || d.pullups > 0);
      return { dataPoints, totals: { totalPullups: dataPoints.reduce((sum, d) => sum + (d.pullups || 0), 0), avgSleep: withSleep.length ? withSleep.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / withSleep.length : null, avgBodyweight: withWeight.length ? withWeight.reduce((sum, d) => sum + (d.bodyweight || 0), 0) / withWeight.length : null, daysWithData: withAnyData.length, daysTracked: dataPoints.length } };
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
  });

  const upsertMetrics = useMutation({
    mutationFn: async (metrics: { date: string; pullups?: number; notes?: string; bodyweight?: number; sleep_hours?: number; }) => {
      if (!user) throw new Error('Not authenticated');
      const updateData: { user_id: string; date: string; pullups?: number; notes?: string; bodyweight?: number; sleep_hours?: number; } = { user_id: user.id, date: metrics.date };
      if (metrics.pullups !== undefined) updateData.pullups = metrics.pullups;
      if (metrics.notes !== undefined) updateData.notes = metrics.notes;
      if (metrics.bodyweight !== undefined) updateData.bodyweight = metrics.bodyweight;
      if (metrics.sleep_hours !== undefined) updateData.sleep_hours = metrics.sleep_hours;
      const { data, error } = await supabase.from('daily_metrics').upsert(updateData, { onConflict: 'user_id,date' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dailyMetrics'] });
      await queryClient.invalidateQueries({ queryKey: ['energy-model-v3-inputs'] });
      await queryClient.refetchQueries({ queryKey: ['dailyMetrics'] });
    },
  });

  return { ...query, upsertMetrics: upsertMetrics.mutateAsync, isUpserting: upsertMetrics.isPending };
}
