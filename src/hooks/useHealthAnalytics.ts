import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export interface VitalsDataPoint {
  date: string;
  sleepHours: number | null;
  energyLevel: number | null;
  heartRate: number | null;
  oxygenLevel: number | null;
  steps: number | null;
  performanceScore: number | null;
}

export interface CalorieDataPoint {
  date: string;
  calories: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
}

export interface BPDataPoint {
  date: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
}

export interface SugarDataPoint {
  date: string;
  glucose: number;
  type: string;
}

export interface WeeklySummary {
  avgSleep: number | null;
  avgEnergy: number | null;
  avgHeartRate: number | null;
  totalSteps: number;
  avgCalories: number | null;
  workoutCount: number;
  weekStart: string;
  weekEnd: string;
}

export function useHealthAnalytics(days: number = 30) {
  const { user } = useAuth();
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

  const vitalsQuery = useQuery({
    queryKey: ['healthAnalytics', 'vitals', user?.id, days],
    queryFn: async (): Promise<VitalsDataPoint[]> => {
      if (!user) return [];

      const [morningRes, nightRes] = await Promise.all([
        supabase
          .from('morning_checkins')
          .select('date, sleep_hours, energy_level, heart_rate, oxygen_level')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .order('date', { ascending: true }),
        supabase
          .from('night_checkins')
          .select('date, steps, performance_score')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .order('date', { ascending: true }),
      ]);

      const morningMap = new Map((morningRes.data || []).map((m: any) => [m.date, m]));
      const nightMap = new Map((nightRes.data || []).map((n: any) => [n.date, n]));

      // Get all unique dates
      const allDates = new Set([...morningMap.keys(), ...nightMap.keys()]);
      const sortedDates = Array.from(allDates).sort();

      return sortedDates.map(date => {
        const morning = morningMap.get(date);
        const night = nightMap.get(date);
        return {
          date,
          sleepHours: morning?.sleep_hours || null,
          energyLevel: morning?.energy_level || null,
          heartRate: morning?.heart_rate || null,
          oxygenLevel: morning?.oxygen_level || null,
          steps: night?.steps || null,
          performanceScore: night?.performance_score || null,
        };
      });
    },
    enabled: !!user,
  });

  const caloriesQuery = useQuery({
    queryKey: ['healthAnalytics', 'calories', user?.id, days],
    queryFn: async (): Promise<CalorieDataPoint[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('meals')
        .select('date, meal_type, calories')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped = (data || []).reduce((acc: Record<string, CalorieDataPoint>, meal: any) => {
        if (!acc[meal.date]) {
          acc[meal.date] = {
            date: meal.date,
            calories: 0,
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            snack: 0,
          };
        }
        const cal = meal.calories || 0;
        acc[meal.date].calories += cal;
        acc[meal.date][meal.meal_type as keyof Omit<CalorieDataPoint, 'date' | 'calories'>] += cal;
        return acc;
      }, {});

      return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!user,
  });

  const bpQuery = useQuery({
    queryKey: ['healthAnalytics', 'bp', user?.id],
    queryFn: async (): Promise<BPDataPoint[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('blood_pressure_readings')
        .select('measured_at, systolic, diastolic, pulse')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: true })
        .limit(52);

      if (error) throw error;

      return (data || []).map((r: any) => ({
        date: format(new Date(r.measured_at), 'yyyy-MM-dd'),
        systolic: r.systolic,
        diastolic: r.diastolic,
        pulse: r.pulse,
      }));
    },
    enabled: !!user,
  });

  const sugarQuery = useQuery({
    queryKey: ['healthAnalytics', 'sugar', user?.id],
    queryFn: async (): Promise<SugarDataPoint[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('blood_sugar_readings')
        .select('measured_at, glucose_level, reading_type')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: true })
        .limit(24);

      if (error) throw error;

      return (data || []).map((r: any) => ({
        date: format(new Date(r.measured_at), 'yyyy-MM-dd'),
        glucose: r.glucose_level,
        type: r.reading_type,
      }));
    },
    enabled: !!user,
  });

  const summaryQuery = useQuery({
    queryKey: ['healthAnalytics', 'summary', user?.id, days],
    queryFn: async (): Promise<WeeklySummary[]> => {
      if (!user) return [];

      // Get current week and previous weeks
      const now = new Date();
      const weeks: WeeklySummary[] = [];

      for (let i = 0; i < Math.ceil(days / 7); i++) {
        const weekEnd = endOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
        const weekStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });

        const [morningRes, nightRes, caloriesRes, workoutsRes] = await Promise.all([
          supabase
            .from('morning_checkins')
            .select('sleep_hours, energy_level, heart_rate')
            .eq('user_id', user.id)
            .gte('date', format(weekStart, 'yyyy-MM-dd'))
            .lte('date', format(weekEnd, 'yyyy-MM-dd')),
          supabase
            .from('night_checkins')
            .select('steps')
            .eq('user_id', user.id)
            .gte('date', format(weekStart, 'yyyy-MM-dd'))
            .lte('date', format(weekEnd, 'yyyy-MM-dd')),
          supabase
            .from('meals')
            .select('date, calories')
            .eq('user_id', user.id)
            .gte('date', format(weekStart, 'yyyy-MM-dd'))
            .lte('date', format(weekEnd, 'yyyy-MM-dd')),
          supabase
            .from('workouts')
            .select('id')
            .eq('user_id', user.id)
            .gte('date', format(weekStart, 'yyyy-MM-dd'))
            .lte('date', format(weekEnd, 'yyyy-MM-dd')),
        ]);

        const morning = morningRes.data || [];
        const night = nightRes.data || [];
        const meals = caloriesRes.data || [];
        const workouts = workoutsRes.data || [];

        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

        // Group calories by date and sum
        const dailyCalories = Object.values(
          (meals as any[]).reduce((acc, m) => {
            if (!acc[m.date]) acc[m.date] = 0;
            acc[m.date] += m.calories || 0;
            return acc;
          }, {} as Record<string, number>)
        ) as number[];

        weeks.push({
          weekStart: format(weekStart, 'MMM d'),
          weekEnd: format(weekEnd, 'MMM d'),
          avgSleep: avg((morning as any[]).filter(m => m.sleep_hours).map(m => m.sleep_hours)),
          avgEnergy: avg((morning as any[]).filter(m => m.energy_level).map(m => m.energy_level)),
          avgHeartRate: avg((morning as any[]).filter(m => m.heart_rate).map(m => m.heart_rate)),
          totalSteps: (night as any[]).reduce((sum, n) => sum + (n.steps || 0), 0),
          avgCalories: avg(dailyCalories),
          workoutCount: workouts.length,
        });
      }

      return weeks;
    },
    enabled: !!user,
  });

  return {
    vitals: vitalsQuery.data ?? [],
    calories: caloriesQuery.data ?? [],
    bloodPressure: bpQuery.data ?? [],
    bloodSugar: sugarQuery.data ?? [],
    weeklySummaries: summaryQuery.data ?? [],
    isLoading: vitalsQuery.isLoading || caloriesQuery.isLoading || bpQuery.isLoading || sugarQuery.isLoading,
  };
}
