import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays, parseISO } from 'date-fns';

export interface HabitDataPoint {
  date: string;
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
          totals: { totalPullups: 0, avgSleep: null, avgEnergy: null, avgBodyweight: null },
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

      // Transform into data points
      const dataPoints: HabitDataPoint[] = (workouts || []).map((w: any) => {
        const habit = w.habits?.[0] || {};
        return {
          date: w.date,
          sleepHours: habit.sleep_hours ?? null,
          energyLevel: habit.energy_level ?? null,
          bodyweight: habit.bodyweight ?? null,
          pullups: habit.pullups ?? 0,
          waterIntake: habit.water_intake ?? 0,
          supplements: habit.supplements ?? {
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

      // Calculate totals
      const validSleep = dataPoints.filter(d => d.sleepHours !== null && d.sleepHours > 0);
      const validEnergy = dataPoints.filter(d => d.energyLevel !== null && d.energyLevel > 0);
      const validBodyweight = dataPoints.filter(d => d.bodyweight !== null && d.bodyweight > 0);

      const totals = {
        totalPullups: dataPoints.reduce((sum, d) => sum + d.pullups, 0),
        avgSleep: validSleep.length > 0
          ? validSleep.reduce((sum, d) => sum + (d.sleepHours || 0), 0) / validSleep.length
          : null,
        avgEnergy: validEnergy.length > 0
          ? validEnergy.reduce((sum, d) => sum + (d.energyLevel || 0), 0) / validEnergy.length
          : null,
        avgBodyweight: validBodyweight.length > 0
          ? validBodyweight.reduce((sum, d) => sum + (d.bodyweight || 0), 0) / validBodyweight.length
          : null,
      };

      // Calculate supplement adherence percentages
      const supplementKeys = ['whey', 'casein', 'creatine', 'omega3', 'vitaminD', 'magnesium', 'zinc'] as const;
      const supplementAdherence: Record<string, number> = {};
      
      if (dataPoints.length > 0) {
        supplementKeys.forEach(key => {
          const taken = dataPoints.filter(d => d.supplements[key]).length;
          supplementAdherence[key] = Math.round((taken / dataPoints.length) * 100);
        });
      }

      return { dataPoints, totals, supplementAdherence };
    },
    enabled: !!user,
  });
}
