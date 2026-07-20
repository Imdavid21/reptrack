import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';

export interface DailyHydration {
  date: string;
  displayDate: string;
  total: number;
  logs: number;
}

export interface HydrationAnalytics {
  dailyData: DailyHydration[];
  totals: {
    totalLiters: number;
    avgDaily: number;
    daysTracked: number;
  };
}

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

/**
 * Pure per-day hydration totals — no goal comparison here. "Met goal" is a
 * point-in-time judgment (what was the target on that specific day), which
 * needs goal_history to resolve correctly, so callers compute it themselves
 * (see HydrationChart) rather than this hook baking in a single flat goal
 * applied to every day.
 */
export function useHydrationData(dateRange?: DateRangeFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['hydrationData', user?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<HydrationAnalytics> => {
      if (!user) {
        return {
          dailyData: [],
          totals: { totalLiters: 0, avgDaily: 0, daysTracked: 0 },
        };
      }

      const endDate = dateRange?.to ?? new Date();
      const startDate = dateRange?.from ?? subDays(endDate, 13);

      // Fetch water logs
      const { data: logs, error } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', startOfDay(startDate).toISOString())
        .lte('timestamp', endOfDay(endDate).toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Create a map of date -> total
      const dailyTotals = new Map<string, { total: number; logs: number }>();
      
      (logs || []).forEach((log: any) => {
        const date = format(parseISO(log.timestamp), 'yyyy-MM-dd');
        const existing = dailyTotals.get(date) || { total: 0, logs: 0 };
        existing.total += Number(log.amount);
        existing.logs += 1;
        dailyTotals.set(date, existing);
      });

      // Generate data for all days in range
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyData: DailyHydration[] = allDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const data = dailyTotals.get(dateKey) || { total: 0, logs: 0 };
        return {
          date: dateKey,
          displayDate: format(day, 'MMM d'),
          total: data.total,
          logs: data.logs,
        };
      });

      // Calculate totals
      const daysWithData = dailyData.filter(d => d.total > 0);
      const totalLiters = dailyData.reduce((sum, d) => sum + d.total, 0);
      
      const totals = {
        totalLiters,
        avgDaily: daysWithData.length > 0 ? totalLiters / daysWithData.length : 0,
        daysTracked: daysWithData.length,
      };

      return { dailyData, totals };
    },
    enabled: !!user,
  });
}
