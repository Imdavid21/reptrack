import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays, startOfWeek, parseISO } from 'date-fns';

export interface VolumeDataPoint {
  date: string;
  week: string;
  totalVolume: number;
  pushVolume: number;
  pullVolume: number;
  legsVolume: number;
}

export interface WeeklyVolume {
  week: string;
  totalVolume: number;
  pushVolume: number;
  pullVolume: number;
  legsVolume: number;
}

export interface VolumeAnalytics {
  dailyData: VolumeDataPoint[];
  weeklyData: WeeklyVolume[];
  totals: {
    totalVolume: number;
    pushVolume: number;
    pullVolume: number;
    legsVolume: number;
  };
}

function parseWeight(weight: string | null): number {
  if (!weight) return 0;
  const match = weight.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function parseReps(reps: string | null): number {
  if (!reps) return 0;
  const match = reps.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function categorizeExercise(category: string): 'push' | 'pull' | 'legs' {
  const lower = category.toLowerCase();
  if (lower.includes('push') || lower.includes('chest') || lower.includes('shoulder') || lower.includes('tricep')) {
    return 'push';
  }
  if (lower.includes('pull') || lower.includes('back') || lower.includes('bicep')) {
    return 'pull';
  }
  return 'legs';
}

export function useVolumeData(days: number = 60) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['volumeData', user?.id, days],
    queryFn: async (): Promise<VolumeAnalytics> => {
      if (!user) {
        return {
          dailyData: [],
          weeklyData: [],
          totals: { totalVolume: 0, pushVolume: 0, pullVolume: 0, legsVolume: 0 },
        };
      }

      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // Fetch workouts with exercises
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(`
          id,
          date,
          day,
          exercises (
            category,
            actual_weight,
            actual_reps,
            completed
          )
        `)
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Process into daily data
      const dailyData: VolumeDataPoint[] = (workouts || []).map((w: any) => {
        let pushVolume = 0;
        let pullVolume = 0;
        let legsVolume = 0;

        (w.exercises || []).forEach((ex: any) => {
          if (!ex.completed) return;
          
          const weight = parseWeight(ex.actual_weight);
          const reps = parseReps(ex.actual_reps);
          const volume = weight * reps;
          
          const category = categorizeExercise(ex.category);
          if (category === 'push') pushVolume += volume;
          else if (category === 'pull') pullVolume += volume;
          else legsVolume += volume;
        });

        const weekStart = startOfWeek(parseISO(w.date), { weekStartsOn: 1 });
        
        return {
          date: w.date,
          week: format(weekStart, 'MMM d'),
          totalVolume: pushVolume + pullVolume + legsVolume,
          pushVolume,
          pullVolume,
          legsVolume,
        };
      });

      // Aggregate into weekly data
      const weeklyMap = new Map<string, WeeklyVolume>();
      
      dailyData.forEach(d => {
        const existing = weeklyMap.get(d.week);
        if (existing) {
          existing.totalVolume += d.totalVolume;
          existing.pushVolume += d.pushVolume;
          existing.pullVolume += d.pullVolume;
          existing.legsVolume += d.legsVolume;
        } else {
          weeklyMap.set(d.week, {
            week: d.week,
            totalVolume: d.totalVolume,
            pushVolume: d.pushVolume,
            pullVolume: d.pullVolume,
            legsVolume: d.legsVolume,
          });
        }
      });

      const weeklyData = Array.from(weeklyMap.values());

      // Calculate totals
      const totals = {
        totalVolume: dailyData.reduce((sum, d) => sum + d.totalVolume, 0),
        pushVolume: dailyData.reduce((sum, d) => sum + d.pushVolume, 0),
        pullVolume: dailyData.reduce((sum, d) => sum + d.pullVolume, 0),
        legsVolume: dailyData.reduce((sum, d) => sum + d.legsVolume, 0),
      };

      return { dailyData, weeklyData, totals };
    },
    enabled: !!user,
  });
}
