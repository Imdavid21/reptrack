import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export interface DailyMetric {
  id: string;
  user_id: string;
  date: string;
  // From morning_checkins (source of truth)
  sleep_hours: number | null;
  energy_level: number | null;
  bodyweight: number | null;
  heart_rate: number | null;
  oxygen_level: number | null;
  // From daily_metrics (unique data)
  pullups: number;
  notes: string | null;
  supplements: {
    whey: boolean;
    casein: boolean;
    creatine: boolean;
    omega3: boolean;
    vitaminD: boolean;
    magnesium: boolean;
    zinc: boolean;
  };
}

export interface MetricsAnalytics {
  dataPoints: DailyMetric[];
  totals: {
    totalPullups: number;
    avgSleep: number | null;
    avgEnergy: number | null;
    avgBodyweight: number | null;
    avgHeartRate: number | null;
    daysWithData: number;
    daysTracked: number;
  };
  supplementAdherence: Record<string, number>;
}

const DEFAULT_SUPPLEMENTS = {
  whey: false,
  casein: false,
  creatine: false,
  omega3: false,
  vitaminD: false,
  magnesium: false,
  zinc: false,
};

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
          totals: { totalPullups: 0, avgSleep: null, avgEnergy: null, avgBodyweight: null, avgHeartRate: null, daysWithData: 0, daysTracked: 0 },
          supplementAdherence: {},
        };
      }

      const startDate = dateRange ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
      const endDate = dateRange ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

      // Fetch from both tables in parallel
      const [morningRes, metricsRes] = await Promise.all([
        // morning_checkins = source of truth for sleep, energy, weight, vitals
        supabase
          .from('morning_checkins')
          .select('date, sleep_hours, energy_level, bodyweight, heart_rate, oxygen_level')
          .eq('user_id', user.id)
          .gte('date', startDate || '1900-01-01')
          .lte('date', endDate || '2100-01-01')
          .order('date', { ascending: true }),
        // daily_metrics = supplements, pullups (unique data not captured elsewhere)
        supabase
          .from('daily_metrics')
          .select('id, date, pullups, notes, supplements')
          .eq('user_id', user.id)
          .gte('date', startDate || '1900-01-01')
          .lte('date', endDate || '2100-01-01')
          .order('date', { ascending: true }),
      ]);

      if (morningRes.error) throw morningRes.error;
      if (metricsRes.error) throw metricsRes.error;

      // Create a map of morning check-ins by date
      const morningMap = new Map<string, any>();
      (morningRes.data || []).forEach(m => morningMap.set(m.date, m));

      // Create a map of daily metrics by date
      const metricsMap = new Map<string, any>();
      (metricsRes.data || []).forEach(m => metricsMap.set(m.date, m));

      // Get all unique dates
      const allDates = new Set([...morningMap.keys(), ...metricsMap.keys()]);
      const sortedDates = Array.from(allDates).sort();

      // Merge data points
      const dataPoints: DailyMetric[] = sortedDates.map(date => {
        const morning = morningMap.get(date);
        const metrics = metricsMap.get(date);

        return {
          id: metrics?.id || `synthetic-${date}`,
          user_id: user.id,
          date,
          // From morning_checkins (primary source)
          sleep_hours: morning?.sleep_hours ?? null,
          energy_level: morning?.energy_level ?? null,
          bodyweight: morning?.bodyweight ?? null,
          heart_rate: morning?.heart_rate ?? null,
          oxygen_level: morning?.oxygen_level ?? null,
          // From daily_metrics (unique data)
          pullups: metrics?.pullups ?? 0,
          notes: metrics?.notes ?? null,
          supplements: metrics?.supplements || DEFAULT_SUPPLEMENTS,
        };
      });

      // Calculate totals
      const withSleep = dataPoints.filter(d => d.sleep_hours !== null && d.sleep_hours > 0);
      const withEnergy = dataPoints.filter(d => d.energy_level !== null);
      const withWeight = dataPoints.filter(d => d.bodyweight !== null && d.bodyweight > 0);
      const withHeartRate = dataPoints.filter(d => d.heart_rate !== null && d.heart_rate > 0);
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
        avgHeartRate: withHeartRate.length > 0
          ? withHeartRate.reduce((sum, d) => sum + (d.heart_rate || 0), 0) / withHeartRate.length
          : null,
        daysWithData: withAnyData.length,
        daysTracked: dataPoints.length,
      };

      // Calculate supplement adherence (only for days with any data)
      const supplementKeys = ['whey', 'casein', 'creatine', 'omega3', 'vitaminD', 'magnesium', 'zinc'] as const;
      const supplementAdherence: Record<string, number> = {};
      
      if (withAnyData.length > 0) {
        supplementKeys.forEach(key => {
          const taken = withAnyData.filter(d => d.supplements?.[key]).length;
          supplementAdherence[key] = Math.round((taken / withAnyData.length) * 100);
        });
      }

      return { dataPoints, totals, supplementAdherence };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // Refresh every minute
  });

  // This mutation now only updates supplements/pullups in daily_metrics
  // Sleep/energy/weight should be updated via morning check-in
  const upsertMetrics = useMutation({
    mutationFn: async (metrics: { date: string; pullups?: number; notes?: string; supplements?: typeof DEFAULT_SUPPLEMENTS }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('daily_metrics')
        .upsert({
          user_id: user.id,
          date: metrics.date,
          pullups: metrics.pullups ?? 0,
          notes: metrics.notes,
          supplements: metrics.supplements ?? DEFAULT_SUPPLEMENTS,
        }, { onConflict: 'user_id,date' })
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
