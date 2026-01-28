import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, startOfWeek, parseISO } from 'date-fns';

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

function categorizeByWorkoutDay(dayName: string): 'push' | 'pull' | 'legs' {
  const lower = dayName.toLowerCase();
  if (lower.includes('push')) {
    return 'push';
  }
  if (lower.includes('pull')) {
    return 'pull';
  }
  return 'legs';
}

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

export function useVolumeData(dateRange?: DateRangeFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['volumeData', user?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async (): Promise<VolumeAnalytics> => {
      if (!user) {
        return {
          dailyData: [],
          weeklyData: [],
          totals: { totalVolume: 0, pushVolume: 0, pullVolume: 0, legsVolume: 0 },
        };
      }

      const startDate = dateRange ? format(dateRange.from, 'yyyy-MM-dd') : '1900-01-01';
      const endDate = dateRange ? format(dateRange.to, 'yyyy-MM-dd') : '2100-01-01';

      // Fetch workouts with exercises
       const { data: workouts, error } = await supabase
         .from('workouts')
         .select(`
           id,
           date,
           day,
           day_name,
           exercises (
             category,
             actual_weight,
             actual_reps,
             completed
           )
         `)
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Process into daily data
      const dailyData: VolumeDataPoint[] = (workouts || []).map((w: any) => {
        let pushVolume = 0;
        let pullVolume = 0;
        let legsVolume = 0;

        // Categorize based on workout day_name (Push A, Pull B, Legs A, etc.)
        const workoutType = categorizeByWorkoutDay(w.day_name || w.day || '');

        (w.exercises || []).forEach((ex: any) => {
          if (!ex.completed) return;
          
          const weight = parseWeight(ex.actual_weight);
          const reps = parseReps(ex.actual_reps);
          const volume = weight * reps;
          
          if (workoutType === 'push') pushVolume += volume;
          else if (workoutType === 'pull') pullVolume += volume;
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
