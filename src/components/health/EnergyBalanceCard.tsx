import { useMeals } from '@/hooks/useMeals';
import { useCalorieBurn } from '@/hooks/useCalorieBurn';
import { useNightCheckin } from '@/hooks/useNightCheckin';
import { useWorkouts } from '@/hooks/useWorkouts';
import { Flame, TrendingUp, TrendingDown, Minus, Footprints, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect } from 'react';

export function EnergyBalanceCard() {
  const { totalCalories: caloriesIn } = useMeals();
  const { totalBurned, addBurn, calculateStepCalories, calculateWorkoutCalories } = useCalorieBurn();
  const { checkin: nightCheckin } = useNightCheckin();
  const { workouts } = useWorkouts();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayWorkout = workouts.find(w => w.date === todayStr);
  const steps = nightCheckin?.steps || 0;

  // Auto-calculate and log burns when data changes
  useEffect(() => {
    const logBurns = async () => {
      // Log step calories
      if (steps > 0) {
        const stepCals = calculateStepCalories(steps);
        await addBurn.mutateAsync({
          source: 'steps',
          calories: stepCals,
          activity_type: 'walking',
        });
      }

      // Log workout calories
      if (todayWorkout?.workout_duration_minutes) {
        const workoutCals = calculateWorkoutCalories(todayWorkout.workout_duration_minutes);
        await addBurn.mutateAsync({
          source: 'workout',
          calories: workoutCals,
          duration_minutes: todayWorkout.workout_duration_minutes,
          activity_type: 'strength',
        });
      }
    };

    if (steps > 0 || todayWorkout) {
      logBurns().catch(console.error);
    }
  }, [steps, todayWorkout?.workout_duration_minutes]);

  const netCalories = caloriesIn - totalBurned;
  const isDeficit = netCalories < 0;
  const isSurplus = netCalories > 200;

  return (
    <div className="card-brutalist">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-4 w-4" />
        <h3 className="section-header mb-0">ENERGY BALANCE</h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold tabular-nums text-primary">
            +{caloriesIn.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">INTAKE</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold tabular-nums text-destructive">
            -{totalBurned.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">BURNED</div>
        </div>

        <div className="text-center">
          <div className={`text-2xl font-bold tabular-nums ${
            isDeficit ? 'text-success' : isSurplus ? 'text-warning' : ''
          }`}>
            {netCalories >= 0 ? '+' : ''}{netCalories.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">NET</div>
        </div>
      </div>

      {/* Burn breakdown */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Footprints className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Steps ({steps.toLocaleString()})</span>
          </div>
          <span className="tabular-nums">-{calculateStepCalories(steps)} cal</span>
        </div>
        
        {todayWorkout && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Workout ({todayWorkout.workout_duration_minutes}min)</span>
            </div>
            <span className="tabular-nums">
              -{calculateWorkoutCalories(todayWorkout.workout_duration_minutes || 0)} cal
            </span>
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className={`mt-4 p-2 border text-center text-sm ${
        isDeficit 
          ? 'border-success/30 bg-success/5' 
          : isSurplus 
            ? 'border-warning/30 bg-warning/5' 
            : 'border-border'
      }`}>
        {isDeficit ? (
          <div className="flex items-center justify-center gap-2">
            <TrendingDown className="h-4 w-4 text-success" />
            <span>Calorie deficit — great for fat loss</span>
          </div>
        ) : isSurplus ? (
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-4 w-4 text-warning" />
            <span>Calorie surplus — good for muscle gain</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <span>Near maintenance</span>
          </div>
        )}
      </div>
    </div>
  );
}
