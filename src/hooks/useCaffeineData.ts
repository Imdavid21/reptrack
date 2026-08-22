import { useQuery } from '@tanstack/react-query';
import { eachDayOfInterval, format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DailyCaffeine {
  date: string;
  displayDate: string;
  totalMg: number;
  logs: number;
  caffeinatedLogs: number;
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
      const startKey = format(startDate, 'yyyy-MM-dd');
      const endKey = format(endDate, 'yyyy-MM-dd');
      const meals: Array<{ date: string; caffeine_mg: number | null; created_at: string | null }> = [];

      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await (supabase as any)
          .from('meals')
          .select('date,caffeine_mg,created_at')
          .eq('user_id', user.id)
          .gte('date', startKey)
          .lte('date', endKey)
          .not('caffeine_mg', 'is', null)
          .order('date', { ascending: true })
          .order('created_at', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        const page = (data ?? []) as Array<{ date: string; caffeine_mg: number | null; created_at: string | null }>;
        meals.push(...page);
        if (page.length < PAGE_SIZE) break;
      }

      const byDay = new Map<string, { totalMg: number; logs: number; caffeinatedLogs: number; lastIntakeAt: string | null }>();
      for (const meal of meals) {
        const current = byDay.get(meal.date) ?? { totalMg: 0, logs: 0, caffeinatedLogs: 0, lastIntakeAt: null };
        const caffeineMg = Number(meal.caffeine_mg || 0);
        current.totalMg += caffeineMg;
        current.logs += 1;
        if (caffeineMg > 0) {
          current.caffeinatedLogs += 1;
          if (meal.created_at && (!current.lastIntakeAt || meal.created_at > current.lastIntakeAt)) current.lastIntakeAt = meal.created_at;
        }
        byDay.set(meal.date, current);
      }

      const dailyData = eachDayOfInterval({ start: startDate, end: endDate }).map(day => {
        const date = format(day, 'yyyy-MM-dd');
        const current = byDay.get(date) ?? { totalMg: 0, logs: 0, caffeinatedLogs: 0, lastIntakeAt: null };
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
