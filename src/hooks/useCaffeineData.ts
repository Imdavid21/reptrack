import { useQuery } from '@tanstack/react-query';
import { eachDayOfInterval, endOfDay, format, parseISO, startOfDay, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DailyCaffeine {
  date: string;
  displayDate: string;
  totalMg: number;
  logs: number;
  lastIntakeAt: string | null;
}

export interface CaffeineAnalytics {
  dailyData: DailyCaffeine[];
  totals: {
    totalMg: number;
    avgDailyMg: number;
    daysTracked: number;
  };
}

export interface CaffeineDateRange {
  from: Date;
  to: Date;
}

const PAGE_SIZE = 1000;

export function useCaffeineData(dateRange?: CaffeineDateRange) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['caffeineData', user?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<CaffeineAnalytics> => {
      if (!user) return { dailyData: [], totals: { totalMg: 0, avgDailyMg: 0, daysTracked: 0 } };

      const endDate = dateRange?.to ?? new Date();
      const startDate = dateRange?.from ?? subDays(endDate, 13);
      const logs: Array<{ amount_mg: number; timestamp: string }> = [];

      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await (supabase as any)
          .from('caffeine_logs')
          .select('amount_mg,timestamp')
          .eq('user_id', user.id)
          .gte('timestamp', startOfDay(startDate).toISOString())
          .lte('timestamp', endOfDay(endDate).toISOString())
          .order('timestamp', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        const page = (data ?? []) as Array<{ amount_mg: number; timestamp: string }>;
        logs.push(...page);
        if (page.length < PAGE_SIZE) break;
      }

      const byDay = new Map<string, { totalMg: number; logs: number; lastIntakeAt: string | null }>();
      for (const log of logs) {
        const date = format(parseISO(log.timestamp), 'yyyy-MM-dd');
        const current = byDay.get(date) ?? { totalMg: 0, logs: 0, lastIntakeAt: null };
        current.totalMg += Number(log.amount_mg || 0);
        current.logs += 1;
        if (!current.lastIntakeAt || log.timestamp > current.lastIntakeAt) current.lastIntakeAt = log.timestamp;
        byDay.set(date, current);
      }

      const dailyData = eachDayOfInterval({ start: startDate, end: endDate }).map(day => {
        const date = format(day, 'yyyy-MM-dd');
        const current = byDay.get(date) ?? { totalMg: 0, logs: 0, lastIntakeAt: null };
        return { date, displayDate: format(day, 'MMM d'), ...current };
      });
      const tracked = dailyData.filter(day => day.logs > 0);
      const totalMg = tracked.reduce((sum, day) => sum + day.totalMg, 0);

      return {
        dailyData,
        totals: {
          totalMg,
          avgDailyMg: tracked.length ? totalMg / tracked.length : 0,
          daysTracked: tracked.length,
        },
      };
    },
    enabled: !!user,
  });
}
