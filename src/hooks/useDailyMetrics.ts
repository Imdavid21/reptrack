import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

export interface DailyMetric {
  id: string;
  user_id: string;
  date: string;
  sleep_hours: number | null;
  energy_level: number | null;
  bodyweight: number | null;
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

export function useDailyMetrics(days: number = 30) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dailyMetrics', user?.id, days],
    queryFn: async (): Promise<MetricsAnalytics> => {
      if (!user) {
        return {
          dataPoints: [],
          totals: { totalPullups: 0, avgSleep: null, avgEnergy: null, avgBodyweight: null, daysWithData: 0, daysTracked: 0 },
          supplementAdherence: {},
        };
      }

      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (error) throw error;

      const dataPoints: DailyMetric[] = (data || []).map((d: any) => ({
        ...d,
        supplements: d.supplements || DEFAULT_SUPPLEMENTS,
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
  });

  const upsertMetrics = useMutation({
    mutationFn: async (metrics: Partial<DailyMetric> & { date: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('daily_metrics')
        .upsert({
          user_id: user.id,
          date: metrics.date,
          sleep_hours: metrics.sleep_hours,
          energy_level: metrics.energy_level,
          bodyweight: metrics.bodyweight,
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
