import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays, parseISO } from 'date-fns';

export interface HabitDataPoint {
  date: string;
  hasData: boolean;
  sleepHours: number | null;
  energyLevel: number | null;
  bodyweight: number | null;
  pullups: number;
  waterIntake: number;
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

export interface HabitsAnalytics {
  dataPoints: HabitDataPoint[];
  totals: {
    totalPullups: number;
    avgSleep: number | null;
    avgEnergy: number | null;
    avgBodyweight: number | null;
    daysWithData: number;
  };
  supplementAdherence: Record<string, number>;
}

export function useHabitsData(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['habitsData', user?.id, days],
    queryFn: async (): Promise<HabitsAnalytics> => {
      if (!user) {
        return {
          dataPoints: [],
          totals: { totalPullups: 0, avgSleep: null, avgEnergy: null, avgBodyweight: null, daysWithData: 0 },
          supplementAdherence: {},
        };
      }

      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // Fetch workouts with habits joined
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          id,
          date,
          habits (
            pullups,
            water_intake,
            sleep_hours,
            energy_level,
            bodyweight,
            supplements
          )
        `)
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Transform into data points - only include workouts that have habits data
      const allDataPoints: HabitDataPoint[] = (workouts || []).map((w: any) => {
        // PostgREST returns 1:1 relationships as an object, but can be an array
        const habit = Array.isArray(w.habits) ? w.habits[0] : w.habits;
        const hasHabitData = habit !== undefined && habit !== null;
        
        return {
          date: w.date,
          hasData: hasHabitData,
          sleepHours: hasHabitData ? (habit.sleep_hours ?? null) : null,
          energyLevel: hasHabitData ? (habit.energy_level ?? null) : null,
          bodyweight: hasHabitData ? (habit.bodyweight ?? null) : null,
          pullups: hasHabitData ? (habit.pullups ?? 0) : 0,
          waterIntake: hasHabitData ? (habit.water_intake ?? 0) : 0,
          supplements: hasHabitData && habit?.supplements ? habit.supplements : {
            whey: false,
            casein: false,
            creatine: false,
            omega3: false,
            vitaminD: false,
            magnesium: false,
            zinc: false,
          },
        };
      });

      // Filter to only entries with actual habit data for calculations
      const dataPointsWithHabits = allDataPoints.filter(d => d.hasData);

      // For charts, use all dataPoints to show gaps
      // For calculations, only use dataPointsWithHabits
      
      // Calculate totals - only from entries with actual data
      const validSleep = dataPointsWithHabits.filter(d => d.sleepHours !== null && d.sleepHours > 0);
      const validEnergy = dataPointsWithHabits.filter(d => d.energyLevel !== null);
      const validBodyweight = dataPointsWithHabits.filter(d => d.bodyweight !== null && d.bodyweight > 0);

      const totals = {
        totalPullups: dataPointsWithHabits.reduce((sum, d) => sum + d.pullups, 0),
        avgSleep: validSleep.length > 0
          ? validSleep.reduce((sum, d) => sum + (d.sleepHours || 0), 0) / validSleep.length
          : null,
        avgEnergy: validEnergy.length > 0
          ? validEnergy.reduce((sum, d) => sum + (d.energyLevel || 0), 0) / validEnergy.length
          : null,
        avgBodyweight: validBodyweight.length > 0
          ? validBodyweight.reduce((sum, d) => sum + (d.bodyweight || 0), 0) / validBodyweight.length
          : null,
        daysWithData: dataPointsWithHabits.length,
      };

      // Calculate supplement adherence - ONLY based on days with habit data
      const supplementKeys = ['whey', 'casein', 'creatine', 'omega3', 'vitaminD', 'magnesium', 'zinc'] as const;
      const supplementAdherence: Record<string, number> = {};
      
      if (dataPointsWithHabits.length > 0) {
        supplementKeys.forEach(key => {
          const taken = dataPointsWithHabits.filter(d => d.supplements[key]).length;
          supplementAdherence[key] = Math.round((taken / dataPointsWithHabits.length) * 100);
        });
      }

      return { dataPoints: allDataPoints, totals, supplementAdherence };
    },
    enabled: !!user,
  });
}
