import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export interface DailyMetric {
  id: string;
  user_id: string;
  date: string;
  // From daily_metrics
  pullups: number;
  notes: string | null;
  bodyweight: number | null;
  sleep_hours: number | null;
  energy_level: number | null;
}

export interface MetricsAnalytics {
  dataPoints: DailyMetric[];
  totals: {
    totalPullups: number;
    avgSleep: number | null;
    avgEnergy: number | null;
    avgBodyweight: number | null;
    daysWithData: number;
    daysTracked: number;
  };
}

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

export function useDailyMetrics(dateRange?: DateRangeFilter) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dailyMetrics', user?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<MetricsAnalytics> => {
      if (!user) {
        return {
          dataPoints: [],
          totals: { totalPullups: 0, avgSleep: null, avgEnergy: null, avgBodyweight: null, daysWithData: 0, daysTracked: 0 },
        };
      }

      const startDate = dateRange ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
      const endDate = dateRange ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

      const { data, error } = await supabase
        .from('daily_metrics')
        .select('id, date, pullups, notes, bodyweight, sleep_hours, energy_level')
        .eq('user_id', user.id)
        .gte('date', startDate || '1900-01-01')
        .lte('date', endDate || '2100-01-01')
        .order('date', { ascending: true });

      if (error) throw error;

      const dataPoints: DailyMetric[] = (data || []).map(d => ({
        id: d.id,
        user_id: user.id,
        date: d.date,
        pullups: d.pullups ?? 0,
        notes: d.notes ?? null,
        bodyweight: d.bodyweight ?? null,
        sleep_hours: d.sleep_hours ?? null,
        energy_level: d.energy_level ?? null,
      }));

      // Calculate totals
      const withSleep = dataPoints.filter(d => d.sleep_hours !== null && d.sleep_hours > 0);
      const withEnergy = dataPoints.filter(d => d.energy_level !== null);
      const withWeight = dataPoints.filter(d => d.bodyweight !== null && d.bodyweight > 0);
      const withAnyData = dataPoints.filter(d => 
        d.sleep_hours !== null || d.energy_level !== null || d.bodyweight !== null || d.pullups > 0
      );

      const totals = {
        totalPullups: dataPoints.reduce((sum, d) => sum + (d.pullups || 0), 0),
        avgSleep: withSleep.length > 0
          ? withSleep.reduce((sum, d) => sum + (d.sleep_hours || 0), 0) / withSleep.length
          : null,
        avgEnergy: withEnergy.length > 0
          ? withEnergy.reduce((sum, d) => sum + (d.energy_level || 0), 0) / withEnergy.length
          : null,
        avgBodyweight: withWeight.length > 0
          ? withWeight.reduce((sum, d) => sum + (d.bodyweight || 0), 0) / withWeight.length
          : null,
        daysWithData: withAnyData.length,
        daysTracked: dataPoints.length,
      };

      return { dataPoints, totals };
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const upsertMetrics = useMutation({
    mutationFn: async (metrics: { date: string; pullups?: number; notes?: string; bodyweight?: number }) => {
      if (!user) throw new Error('Not authenticated');

      // Build update object with only provided fields
      const updateData: {
        user_id: string;
        date: string;
        pullups?: number;
        notes?: string;
        bodyweight?: number;
      } = {
        user_id: user.id,
        date: metrics.date,
      };
      if (metrics.pullups !== undefined) updateData.pullups = metrics.pullups;
      if (metrics.notes !== undefined) updateData.notes = metrics.notes;
      if (metrics.bodyweight !== undefined) updateData.bodyweight = metrics.bodyweight;

      const { data, error } = await supabase
        .from('daily_metrics')
        .upsert(updateData, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyMetrics'] });
    },
  });

  return {
    ...query,
    upsertMetrics: upsertMetrics.mutateAsync,
    isUpserting: upsertMetrics.isPending,
  };
}
