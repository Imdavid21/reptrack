import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useWorkouts } from './useWorkouts';
import { useDailyMetrics } from './useDailyMetrics';
import { useUserPreferences } from './useUserPreferences';
import { buildCoachPrompts, CoachPrompt } from '@/lib/coachPrompts';
import { localDateKey } from '@/lib/dateKey';

/**
 * Assembles the in-app coach prompts from workouts, recent metrics, and (in a
 * cut) recent protein intake. Shown as banners on the dashboard.
 */
export function useCoachPrompts(): CoachPrompt[] {
  const { user } = useAuth();
  const { workouts } = useWorkouts();
  const { preferences } = useUserPreferences();
  const deficitMode = preferences?.deficit_mode_enabled ?? false;

  const { data: metricsData } = useDailyMetrics({ from: subDays(new Date(), 7), to: new Date() });

  // Recent avg protein (only needed in a cut, for the floor check).
  const { data: avgProtein } = useQuery({
    queryKey: ['coach-protein', user?.id],
    enabled: !!user && deficitMode,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const from = localDateKey(subDays(new Date(), 3));
      const { data, error } = await supabase
        .from('meals').select('date, protein').eq('user_id', user!.id).gte('date', from);
      if (error) throw error;
      const byDay: Record<string, number> = {};
      for (const r of data ?? []) byDay[r.date as string] = (byDay[r.date as string] ?? 0) + ((r.protein as number) ?? 0);
      const days = Object.values(byDay);
      return days.length ? days.reduce((s, v) => s + v, 0) / days.length : 0;
    },
  });

  const latestBodyweight = useMemo(() => {
    return metricsData?.dataPoints
      .filter(d => (d.bodyweight ?? 0) > 0)
      .sort((a, b) => b.date.localeCompare(a.date))[0]?.bodyweight ?? undefined;
  }, [metricsData]);

  return useMemo(() => buildCoachPrompts({
    todayKey: localDateKey(),
    workouts: workouts.map(w => ({ date: w.date, day_name: w.day_name })),
    metrics: (metricsData?.dataPoints ?? []).map(d => ({ date: d.date, sleep_hours: d.sleep_hours, bodyweight: d.bodyweight })),
    deficitMode,
    avgProtein: avgProtein ?? undefined,
    bodyweightKg: latestBodyweight,
  }), [workouts, metricsData, deficitMode, avgProtein, latestBodyweight]);
}
