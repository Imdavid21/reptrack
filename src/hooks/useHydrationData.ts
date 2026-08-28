import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';

export interface DailyHydration { date: string; displayDate: string; total: number; logs: number; }
export interface HydrationAnalytics { dailyData: DailyHydration[]; totals: { totalLiters: number; avgDaily: number; daysTracked: number; }; }
export interface DateRangeFilter { from: Date; to: Date; }

export function useHydrationData(dateRange?: DateRangeFilter) {
  const { user } = useAuth();
  const endDate = dateRange?.to ?? new Date();
  const startDate = dateRange?.from ?? subDays(endDate, 13);
  const fromKey = format(startDate, 'yyyy-MM-dd');
  const toKey = format(endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['hydrationData', user?.id, fromKey, toKey],
    queryFn: async (): Promise<HydrationAnalytics> => {
      if (!user) return { dailyData: [], totals: { totalLiters: 0, avgDaily: 0, daysTracked: 0 } };
      const { data: logs, error } = await supabase.from('water_logs').select('*').eq('user_id', user.id).gte('timestamp', startOfDay(startDate).toISOString()).lte('timestamp', endOfDay(endDate).toISOString()).order('timestamp', { ascending: true });
      if (error) throw error;
      const dailyTotals = new Map<string, { total: number; logs: number }>();
      (logs || []).forEach((log: any) => { const date = format(parseISO(log.timestamp), 'yyyy-MM-dd'); const existing = dailyTotals.get(date) || { total: 0, logs: 0 }; existing.total += Number(log.amount); existing.logs += 1; dailyTotals.set(date, existing); });
      const dailyData: DailyHydration[] = eachDayOfInterval({ start: startDate, end: endDate }).map(day => { const dateKey = format(day, 'yyyy-MM-dd'); const data = dailyTotals.get(dateKey) || { total: 0, logs: 0 }; return { date: dateKey, displayDate: format(day, 'MMM d'), total: data.total, logs: data.logs }; });
      const daysWithData = dailyData.filter(d => d.total > 0);
      const totalLiters = dailyData.reduce((sum, d) => sum + d.total, 0);
      return { dailyData, totals: { totalLiters, avgDaily: daysWithData.length ? totalLiters / daysWithData.length : 0, daysTracked: daysWithData.length } };
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
  });
}
