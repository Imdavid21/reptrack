import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, parseISO } from 'date-fns';
import { DateRangeFilter } from './useExerciseSets';

export interface WorkoutWithMetrics {
  id: string;
  date: string;
  day_name: string;
  pre_energy: number | null;
  pre_motivation: number | null;
  pre_soreness: number | null;
  post_difficulty: number | null;
  post_satisfaction: number | null;
  totalVolume: number;
  exerciseCount: number;
  prCount: number;
}

export interface CorrelationData {
  metric: string;
  value: number;
  avgVolume: number;
  avgSatisfaction: number;
  workoutCount: number;
}

export interface CorrelationInsight {
  metric: string;
  correlation: 'positive' | 'negative' | 'neutral';
  percentage: number;
  description: string;
}

export function useWorkoutCorrelations(dateRange?: DateRangeFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workoutCorrelations', user?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      if (!user) {
        return {
          workouts: [],
          energyCorrelation: [],
          motivationCorrelation: [],
          sorenessCorrelation: [],
          insights: [],
        };
      }

      // Fetch workouts with pre/post metrics
      let workoutsQuery = supabase
        .from('workouts')
        .select('id, date, day_name, pre_energy, pre_motivation, pre_soreness, post_difficulty, post_satisfaction')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (dateRange) {
        workoutsQuery = workoutsQuery
          .gte('date', format(dateRange.from, 'yyyy-MM-dd'))
          .lte('date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data: workoutsData, error: workoutsError } = await workoutsQuery;
      if (workoutsError) throw workoutsError;

      // Filter to workouts that have pre-workout data
      const workoutsWithMetrics = (workoutsData || []).filter(
        w => w.pre_energy !== null || w.pre_motivation !== null || w.pre_soreness !== null
      );

      if (workoutsWithMetrics.length === 0) {
        return {
          workouts: [],
          energyCorrelation: [],
          motivationCorrelation: [],
          sorenessCorrelation: [],
          insights: [],
        };
      }

      // Fetch exercise sets for volume calculation
      const workoutIds = workoutsWithMetrics.map(w => w.id);
      const { data: setsData, error: setsError } = await supabase
        .from('exercise_sets')
        .select('workout_id, actual_weight, actual_reps, completed')
        .in('workout_id', workoutIds)
        .eq('completed', true);

      if (setsError) throw setsError;

      // Calculate volume per workout
      const volumeByWorkout = new Map<string, number>();
      const setCountByWorkout = new Map<string, number>();
      
      (setsData || []).forEach(set => {
        const volume = (set.actual_weight || 0) * (set.actual_reps || 0);
        volumeByWorkout.set(
          set.workout_id,
          (volumeByWorkout.get(set.workout_id) || 0) + volume
        );
        setCountByWorkout.set(
          set.workout_id,
          (setCountByWorkout.get(set.workout_id) || 0) + 1
        );
      });

      // Build workout data with metrics
      const workouts: WorkoutWithMetrics[] = workoutsWithMetrics.map(w => ({
        id: w.id,
        date: w.date,
        day_name: w.day_name,
        pre_energy: w.pre_energy,
        pre_motivation: w.pre_motivation,
        pre_soreness: w.pre_soreness,
        post_difficulty: w.post_difficulty,
        post_satisfaction: w.post_satisfaction,
        totalVolume: volumeByWorkout.get(w.id) || 0,
        exerciseCount: setCountByWorkout.get(w.id) || 0,
        prCount: 0, // TODO: Calculate PRs
      }));

      // Calculate correlations by grouping metrics into buckets
      const calculateCorrelation = (
        metricExtractor: (w: WorkoutWithMetrics) => number | null,
        invert: boolean = false
      ): CorrelationData[] => {
        const buckets = new Map<number, { volumes: number[]; satisfactions: number[] }>();

        workouts.forEach(w => {
          const metric = metricExtractor(w);
          if (metric === null) return;

          if (!buckets.has(metric)) {
            buckets.set(metric, { volumes: [], satisfactions: [] });
          }
          const bucket = buckets.get(metric)!;
          bucket.volumes.push(w.totalVolume);
          if (w.post_satisfaction !== null) {
            bucket.satisfactions.push(w.post_satisfaction);
          }
        });

        return Array.from(buckets.entries())
          .map(([value, data]) => ({
            metric: invert ? `${11 - value}` : `${value}`,
            value: invert ? 11 - value : value,
            avgVolume: data.volumes.length > 0 
              ? Math.round(data.volumes.reduce((a, b) => a + b, 0) / data.volumes.length)
              : 0,
            avgSatisfaction: data.satisfactions.length > 0
              ? Math.round((data.satisfactions.reduce((a, b) => a + b, 0) / data.satisfactions.length) * 10) / 10
              : 0,
            workoutCount: data.volumes.length,
          }))
          .sort((a, b) => a.value - b.value);
      };

      const energyCorrelation = calculateCorrelation(w => w.pre_energy);
      const motivationCorrelation = calculateCorrelation(w => w.pre_motivation);
      // For soreness, lower is better, so we show it inverted (10 = no soreness)
      const sorenessCorrelation = calculateCorrelation(w => w.pre_soreness);

      // Generate insights
      const insights: CorrelationInsight[] = [];

      // Energy insight
      if (energyCorrelation.length >= 2) {
        const lowEnergy = energyCorrelation.filter(d => d.value <= 4);
        const highEnergy = energyCorrelation.filter(d => d.value >= 7);
        
        if (lowEnergy.length > 0 && highEnergy.length > 0) {
          const lowAvg = lowEnergy.reduce((sum, d) => sum + d.avgVolume, 0) / lowEnergy.length;
          const highAvg = highEnergy.reduce((sum, d) => sum + d.avgVolume, 0) / highEnergy.length;
          
          if (highAvg > lowAvg && lowAvg > 0) {
            const percentage = Math.round(((highAvg - lowAvg) / lowAvg) * 100);
            if (percentage > 5) {
              insights.push({
                metric: 'energy',
                correlation: 'positive',
                percentage,
                description: `You lift ${percentage}% more volume when starting with high energy (7+) vs low energy (≤4)`,
              });
            }
          }
        }
      }

      // Motivation insight
      if (motivationCorrelation.length >= 2) {
        const lowMotiv = motivationCorrelation.filter(d => d.value <= 4);
        const highMotiv = motivationCorrelation.filter(d => d.value >= 7);
        
        if (lowMotiv.length > 0 && highMotiv.length > 0) {
          const lowAvg = lowMotiv.reduce((sum, d) => sum + d.avgVolume, 0) / lowMotiv.length;
          const highAvg = highMotiv.reduce((sum, d) => sum + d.avgVolume, 0) / highMotiv.length;
          
          if (highAvg > lowAvg && lowAvg > 0) {
            const percentage = Math.round(((highAvg - lowAvg) / lowAvg) * 100);
            if (percentage > 5) {
              insights.push({
                metric: 'motivation',
                correlation: 'positive',
                percentage,
                description: `High motivation (7+) correlates with ${percentage}% more volume`,
              });
            }
          }
        }
      }

      // Soreness insight (inverted - less soreness = more volume)
      if (sorenessCorrelation.length >= 2) {
        const highSoreness = sorenessCorrelation.filter(d => d.value >= 7);
        const lowSoreness = sorenessCorrelation.filter(d => d.value <= 4);
        
        if (highSoreness.length > 0 && lowSoreness.length > 0) {
          const highSoreAvg = highSoreness.reduce((sum, d) => sum + d.avgVolume, 0) / highSoreness.length;
          const lowSoreAvg = lowSoreness.reduce((sum, d) => sum + d.avgVolume, 0) / lowSoreness.length;
          
          if (lowSoreAvg > highSoreAvg && highSoreAvg > 0) {
            const percentage = Math.round(((lowSoreAvg - highSoreAvg) / highSoreAvg) * 100);
            if (percentage > 5) {
              insights.push({
                metric: 'soreness',
                correlation: 'negative',
                percentage,
                description: `Low soreness (≤4) leads to ${percentage}% more volume than high soreness (7+)`,
              });
            }
          }
        }
      }

      return {
        workouts,
        energyCorrelation,
        motivationCorrelation,
        sorenessCorrelation,
        insights,
      };
    },
    enabled: !!user,
  });
}
