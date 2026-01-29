import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWaterLogs } from '@/hooks/useWaterLogs';
import { useMeals } from '@/hooks/useMeals';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { Droplets, Flame, Dumbbell, Loader2 } from 'lucide-react';
import { differenceInMinutes, format } from 'date-fns';
import { toast } from '@/lib/toast';
import { MealLogDialog } from './MealLogDialog';

const WATER_GOAL = 3.5;
const CALORIE_GOAL = 2000;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function getWorkoutMinutes(workout: { workout_duration_minutes?: number | null; started_at?: string | null; completed_at?: string | null; }): number {
  if (typeof workout.workout_duration_minutes === 'number' && workout.workout_duration_minutes > 0) {
    return workout.workout_duration_minutes;
  }

  if (workout.started_at && workout.completed_at) {
    const mins = differenceInMinutes(new Date(workout.completed_at), new Date(workout.started_at));
    return mins > 0 ? mins : 0;
  }

  return 0;
}

export function TodayStats() {
  const { totalToday: waterTotal, addWaterLog, isAdding: isAddingWater } = useWaterLogs();
  const { totalCalories } = useMeals();
  const { workouts } = useWorkouts();
  const { draft } = useDraftWorkout();
  const [elapsedMinutes, setElapsedMinutes] = useState<number | null>(null);
  const [showMealDialog, setShowMealDialog] = useState(false);

  // Live counter for active workout session
  useEffect(() => {
    if (!draft?.workoutStartTime) {
      setElapsedMinutes(null);
      return;
    }
    const updateElapsed = () => {
      const mins = differenceInMinutes(new Date(), new Date(draft.workoutStartTime!));
      setElapsedMinutes(mins > 0 ? mins : 1);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [draft?.workoutStartTime]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const completedWorkoutMinutes = workouts
    .filter(w => w.date === todayStr)
    .reduce((sum, w) => sum + getWorkoutMinutes(w), 0);

  const isActiveSession = elapsedMinutes !== null;
  const displayMinutes = isActiveSession ? elapsedMinutes : completedWorkoutMinutes;
  const hasWorkoutData = displayMinutes > 0;

  const handleQuickWater = async () => {
    try {
      await addWaterLog(0.25);
      toast.success('+250ml');
    } catch (error) {
      toast.error('Failed to log water');
    }
  };

  const stats = [
    {
      key: 'water',
      icon: Droplets,
      value: `${waterTotal.toFixed(1)}L`,
      goal: WATER_GOAL,
      current: waterTotal,
      label: '+WATER',
      onClick: handleQuickWater,
      isLoading: isAddingWater,
    },
    {
      key: 'calories',
      icon: Flame,
      value: totalCalories.toLocaleString(),
      goal: CALORIE_GOAL,
      current: totalCalories,
      label: '+MEAL',
      onClick: () => setShowMealDialog(true),
    },
    {
      key: 'workout',
      icon: Dumbbell,
      value: hasWorkoutData ? formatDuration(displayMinutes) : '-',
      goal: 1,
      current: hasWorkoutData ? 1 : 0,
      label: isActiveSession ? 'ACTIVE' : 'WORKOUT',
      isBoolean: true,
      isActive: isActiveSession,
      to: '/log',
    },
  ];

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {stats.map(({ key, icon: Icon, value, goal, current, label, isBoolean, isActive, onClick, to, isLoading }) => {
          const progress = isBoolean ? (current ? 100 : 0) : Math.min((current / goal) * 100, 100);
          const isComplete = progress >= 100;

          const content = (
            <>
              <div className="relative">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className={`h-4 w-4 ${isComplete ? 'text-primary' : 'text-muted-foreground'}`} />
                )}
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold tabular-nums">{value}</div>
                <div className="text-2xs text-muted-foreground">{label}</div>
              </div>
            </>
          );

          if (to) {
            return (
              <Link
                key={key}
                to={to}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border border-border bg-card min-w-[90px] hover:bg-muted transition-colors"
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={key}
              onClick={onClick}
              disabled={isLoading}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border border-border bg-card min-w-[90px] hover:bg-muted transition-colors disabled:opacity-50"
            >
              {content}
            </button>
          );
        })}
      </div>

      <MealLogDialog open={showMealDialog} onOpenChange={setShowMealDialog} />
    </>
  );
}
