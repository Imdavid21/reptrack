import { useWaterLogs } from '@/hooks/useWaterLogs';
import { useMeals } from '@/hooks/useMeals';
import { useNightCheckin } from '@/hooks/useNightCheckin';
import { useWorkouts } from '@/hooks/useWorkouts';
import { Droplets, Flame, Footprints, Dumbbell, Check } from 'lucide-react';
import { format } from 'date-fns';

const WATER_GOAL = 3.5;
const CALORIE_GOAL = 2000;
const STEP_GOAL = 10000;

export function TodayStats() {
  const { totalToday: waterTotal } = useWaterLogs();
  const { totalCalories } = useMeals();
  const { checkin: nightCheckin } = useNightCheckin();
  const { workouts } = useWorkouts();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const hasWorkoutToday = workouts.some(w => w.date === todayStr);
  const steps = nightCheckin?.steps || 0;

  const stats = [
    {
      icon: Droplets,
      value: `${waterTotal.toFixed(1)}L`,
      goal: WATER_GOAL,
      current: waterTotal,
      label: 'Water',
    },
    {
      icon: Flame,
      value: totalCalories.toLocaleString(),
      goal: CALORIE_GOAL,
      current: totalCalories,
      label: 'Cal',
    },
    {
      icon: Footprints,
      value: steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps.toString(),
      goal: STEP_GOAL,
      current: steps,
      label: 'Steps',
    },
    {
      icon: hasWorkoutToday ? Check : Dumbbell,
      value: hasWorkoutToday ? '✓' : '-',
      goal: 1,
      current: hasWorkoutToday ? 1 : 0,
      label: 'Workout',
      isBoolean: true,
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
      {stats.map(({ icon: Icon, value, goal, current, label, isBoolean }) => {
        const progress = isBoolean ? (current ? 100 : 0) : Math.min((current / goal) * 100, 100);
        const isComplete = progress >= 100;

        return (
          <div
            key={label}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border border-border bg-card min-w-[90px]"
          >
            <div className="relative">
              <Icon className={`h-4 w-4 ${isComplete ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <div className="text-sm font-bold tabular-nums">{value}</div>
              <div className="text-2xs text-muted-foreground">{label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
