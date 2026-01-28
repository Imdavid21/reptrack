import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { subDays, format } from 'date-fns';

export interface Correlation {
  id: string;
  title: string;
  insight: string;
  strength: number;
  positive: boolean;
  dataPoints: number;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  workouts: number;
  totalVolume: number;
  avgSleep: number | null;
  avgEnergy: number | null;
  avgSteps: number | null;
  caloriesIn: number;
  caloriesOut: number;
  priorWeekWorkouts?: number;
  priorWeekVolume?: number;
}

export interface MonthlySummary {
  month: string;
  workouts: number;
  totalVolume: number;
  avgSleep: number | null;
  avgEnergy: number | null;
  weightChange: number | null;
  bestExercise: { name: string; improvement: number } | null;
  priorMonthWorkouts?: number;
}

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

export function useCorrelationAnalysis(dateRange?: DateRangeFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['correlationAnalysis', user?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      if (!user) return { correlations: [], weeklySummaries: [], monthlySummary: null };

      // Use provided dateRange or default to last 60 days
      const now = new Date();
      const endDate = dateRange?.to ?? now;
      const startDate = dateRange?.from ?? subDays(now, 60);
      
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const priorStart = format(subDays(startDate, 60), 'yyyy-MM-dd');

      // Fetch all relevant data
      const [workoutsRes, morningRes, nightRes, mealsRes, exercisesRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('id, date, post_satisfaction, post_difficulty, workout_duration_minutes, completed_at')
          .eq('user_id', user.id)
          .gte('date', priorStart)
          .order('date', { ascending: true }),
        supabase
          .from('morning_checkins')
          .select('date, sleep_hours, energy_level, heart_rate')
          .eq('user_id', user.id)
          .gte('date', priorStart)
          .order('date', { ascending: true }),
        supabase
          .from('night_checkins')
          .select('date, steps, energy_score')
          .eq('user_id', user.id)
          .gte('date', priorStart)
          .order('date', { ascending: true }),
        supabase
          .from('meals')
          .select('date, calories, protein')
          .eq('user_id', user.id)
          .gte('date', startDateStr)
          .order('date', { ascending: true }),
        supabase
          .from('exercises')
          .select('workout_id, name, actual_weight, actual_reps, completed')
          .in('workout_id', (await supabase
            .from('workouts')
            .select('id')
            .eq('user_id', user.id)
            .gte('date', startDateStr)).data?.map(w => w.id) || []),
      ]);

      const workouts = workoutsRes.data || [];
      const morningData = morningRes.data || [];
      const nightData = nightRes.data || [];
      const meals = mealsRes.data || [];
      const exercises = exercisesRes.data || [];

      // Calculate correlations from real data
      const correlations: Correlation[] = [];

      // 1. Sleep → Performance correlation
      const sleepPerformanceData: { sleep: number; satisfaction: number }[] = [];
      workouts.forEach(w => {
        const morning = morningData.find(m => m.date === w.date);
        if (morning?.sleep_hours && w.post_satisfaction) {
          sleepPerformanceData.push({
            sleep: morning.sleep_hours,
            satisfaction: w.post_satisfaction,
          });
        }
      });

      if (sleepPerformanceData.length >= 5) {
        const highSleep = sleepPerformanceData.filter(d => d.sleep >= 7);
        const lowSleep = sleepPerformanceData.filter(d => d.sleep < 6);
        
        if (highSleep.length >= 2 && lowSleep.length >= 2) {
          const avgHighSat = highSleep.reduce((s, d) => s + d.satisfaction, 0) / highSleep.length;
          const avgLowSat = lowSleep.reduce((s, d) => s + d.satisfaction, 0) / lowSleep.length;
          const diff = Math.round(((avgHighSat - avgLowSat) / avgLowSat) * 100);
          
          if (Math.abs(diff) > 5) {
            correlations.push({
              id: 'sleep-performance',
              title: 'Sleep → Performance',
              insight: diff > 0 
                ? `You rate workouts ${diff}% higher after 7+ hours of sleep.`
                : `Sleep under 6h correlates with ${Math.abs(diff)}% lower satisfaction.`,
              strength: Math.min(Math.abs(diff) + 40, 95),
              positive: diff > 0,
              dataPoints: sleepPerformanceData.length,
            });
          }
        }
      }

      // 2. Morning Energy → Volume correlation
      const energyVolumeData: { energy: number; volume: number }[] = [];
      workouts.forEach(w => {
        const morning = morningData.find(m => m.date === w.date);
        const workoutExercises = exercises.filter(e => e.workout_id === w.id && e.completed);
        
        if (morning?.energy_level && workoutExercises.length > 0) {
          const volume = workoutExercises.reduce((sum, e) => {
            const weight = parseFloat(e.actual_weight?.match(/[\d.]+/)?.[0] || '0');
            const reps = parseInt(e.actual_reps?.match(/\d+/)?.[0] || '0');
            return sum + weight * reps;
          }, 0);
          
          if (volume > 0) {
            energyVolumeData.push({ energy: morning.energy_level, volume });
          }
        }
      });

      if (energyVolumeData.length >= 5) {
        const highEnergy = energyVolumeData.filter(d => d.energy >= 7);
        const lowEnergy = energyVolumeData.filter(d => d.energy <= 4);
        
        if (highEnergy.length >= 2 && lowEnergy.length >= 2) {
          const avgHighVol = highEnergy.reduce((s, d) => s + d.volume, 0) / highEnergy.length;
          const avgLowVol = lowEnergy.reduce((s, d) => s + d.volume, 0) / lowEnergy.length;
          const diff = Math.round(((avgHighVol - avgLowVol) / avgLowVol) * 100);
          
          if (Math.abs(diff) > 5) {
            correlations.push({
              id: 'energy-volume',
              title: 'Energy → Volume',
              insight: diff > 0
                ? `High morning energy (7+) correlates with ${diff}% more volume.`
                : `Low energy days see reduced training volume.`,
              strength: Math.min(Math.abs(diff) + 35, 90),
              positive: diff > 0,
              dataPoints: energyVolumeData.length,
            });
          }
        }
      }

      // 3. Steps → Night Energy correlation
      const stepsEnergyData = nightData
        .filter(n => n.steps && n.steps > 0 && n.energy_score)
        .map(n => ({ steps: n.steps!, energy: n.energy_score! }));

      if (stepsEnergyData.length >= 5) {
        const activeSteps = stepsEnergyData.filter(d => d.steps >= 8000);
        const lowSteps = stepsEnergyData.filter(d => d.steps < 5000);
        
        if (activeSteps.length >= 2 && lowSteps.length >= 2) {
          const avgActiveEnergy = activeSteps.reduce((s, d) => s + d.energy, 0) / activeSteps.length;
          const avgLowEnergy = lowSteps.reduce((s, d) => s + d.energy, 0) / lowSteps.length;
          const diff = (avgActiveEnergy - avgLowEnergy).toFixed(1);
          
          if (Math.abs(parseFloat(diff)) > 0.3) {
            correlations.push({
              id: 'steps-energy',
              title: 'Activity → Energy',
              insight: parseFloat(diff) > 0
                ? `8k+ step days correlate with +${diff} pts evening energy.`
                : `Higher step counts may be reducing evening energy.`,
              strength: Math.min(Math.abs(parseFloat(diff)) * 20 + 40, 85),
              positive: parseFloat(diff) > 0,
              dataPoints: stepsEnergyData.length,
            });
          }
        }
      }

      // 4. Protein → Recovery (next day energy)
      const proteinRecoveryData: { protein: number; nextDayEnergy: number }[] = [];
      meals.forEach((meal, i) => {
        const nextDayMorning = morningData.find(m => {
          const mealDate = new Date(meal.date);
          const morningDate = new Date(m.date);
          return morningDate.getTime() - mealDate.getTime() === 86400000; // 1 day diff
        });
        
        if (meal.protein && nextDayMorning?.energy_level) {
          proteinRecoveryData.push({
            protein: meal.protein,
            nextDayEnergy: nextDayMorning.energy_level,
          });
        }
      });

      if (proteinRecoveryData.length >= 5) {
        const highProtein = proteinRecoveryData.filter(d => d.protein >= 100);
        const lowProtein = proteinRecoveryData.filter(d => d.protein < 60);
        
        if (highProtein.length >= 2 && lowProtein.length >= 2) {
          const avgHighEnergy = highProtein.reduce((s, d) => s + d.nextDayEnergy, 0) / highProtein.length;
          const avgLowEnergy = lowProtein.reduce((s, d) => s + d.nextDayEnergy, 0) / lowProtein.length;
          const diff = (avgHighEnergy - avgLowEnergy).toFixed(1);
          
          if (Math.abs(parseFloat(diff)) > 0.3) {
            correlations.push({
              id: 'protein-recovery',
              title: 'Protein → Recovery',
              insight: parseFloat(diff) > 0
                ? `100g+ protein days boost next-day energy by ${diff} pts.`
                : `High protein may not be improving recovery for you.`,
              strength: Math.min(Math.abs(parseFloat(diff)) * 15 + 45, 80),
              positive: parseFloat(diff) > 0,
              dataPoints: proteinRecoveryData.length,
            });
          }
        }
      }

      // Calculate weekly summaries (last 4 weeks)
      const weeklySummaries: WeeklySummary[] = [];
      
      for (let i = 0; i < 4; i++) {
        const weekEnd = subDays(now, i * 7);
        const weekStart = subDays(weekEnd, 6);
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
        
        const weekWorkouts = workouts.filter(w => w.date >= weekStartStr && w.date <= weekEndStr);
        const weekMornings = morningData.filter(m => m.date >= weekStartStr && m.date <= weekEndStr);
        const weekNights = nightData.filter(n => n.date >= weekStartStr && n.date <= weekEndStr);
        const weekMeals = meals.filter(m => m.date >= weekStartStr && m.date <= weekEndStr);
        
        const weekExercises = exercises.filter(e => 
          weekWorkouts.some(w => w.id === e.workout_id) && e.completed
        );
        
        const totalVolume = weekExercises.reduce((sum, e) => {
          const weight = parseFloat(e.actual_weight?.match(/[\d.]+/)?.[0] || '0');
          const reps = parseInt(e.actual_reps?.match(/\d+/)?.[0] || '0');
          return sum + weight * reps;
        }, 0);
        
        const sleepData = weekMornings.filter(m => m.sleep_hours).map(m => m.sleep_hours!);
        const energyData = weekMornings.filter(m => m.energy_level).map(m => m.energy_level!);
        const stepsData = weekNights.filter(n => n.steps && n.steps > 0).map(n => n.steps!);
        
        weeklySummaries.push({
          weekStart: format(weekStart, 'MMM d'),
          weekEnd: format(weekEnd, 'MMM d'),
          workouts: weekWorkouts.length,
          totalVolume: Math.round(totalVolume),
          avgSleep: sleepData.length ? sleepData.reduce((a, b) => a + b, 0) / sleepData.length : null,
          avgEnergy: energyData.length ? energyData.reduce((a, b) => a + b, 0) / energyData.length : null,
          avgSteps: stepsData.length ? Math.round(stepsData.reduce((a, b) => a + b, 0) / stepsData.length) : null,
          caloriesIn: weekMeals.reduce((sum, m) => sum + (m.calories || 0), 0),
          caloriesOut: weekWorkouts.length * 350, // Estimate
        });
      }

      // Add week-over-week comparisons
      for (let i = 0; i < weeklySummaries.length - 1; i++) {
        weeklySummaries[i].priorWeekWorkouts = weeklySummaries[i + 1].workouts;
        weeklySummaries[i].priorWeekVolume = weeklySummaries[i + 1].totalVolume;
      }

      // Calculate monthly summary
      const monthStart = format(subDays(now, 30), 'yyyy-MM-dd');
      const monthWorkouts = workouts.filter(w => w.date >= monthStart);
      const priorMonthWorkouts = workouts.filter(w => {
        const d = w.date;
        return d >= format(subDays(now, 60), 'yyyy-MM-dd') && d < monthStart;
      });
      
      const monthMornings = morningData.filter(m => m.date >= monthStart);
      const monthExercises = exercises.filter(e => 
        monthWorkouts.some(w => w.id === e.workout_id) && e.completed
      );
      
      const monthVolume = monthExercises.reduce((sum, e) => {
        const weight = parseFloat(e.actual_weight?.match(/[\d.]+/)?.[0] || '0');
        const reps = parseInt(e.actual_reps?.match(/\d+/)?.[0] || '0');
        return sum + weight * reps;
      }, 0);
      
      const monthSleep = monthMornings.filter(m => m.sleep_hours).map(m => m.sleep_hours!);
      const monthEnergy = monthMornings.filter(m => m.energy_level).map(m => m.energy_level!);

      const monthlySummary: MonthlySummary = {
        month: format(now, 'MMMM yyyy'),
        workouts: monthWorkouts.length,
        totalVolume: Math.round(monthVolume),
        avgSleep: monthSleep.length ? monthSleep.reduce((a, b) => a + b, 0) / monthSleep.length : null,
        avgEnergy: monthEnergy.length ? monthEnergy.reduce((a, b) => a + b, 0) / monthEnergy.length : null,
        weightChange: null, // Would need bodyweight tracking
        bestExercise: null, // Would need PR analysis
        priorMonthWorkouts: priorMonthWorkouts.length,
      };

      return { correlations, weeklySummaries, monthlySummary };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
