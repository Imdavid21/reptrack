import { useState, useEffect } from 'react';
import { defaultRoutine } from '@/lib/workoutPresets';
import { getSplitDays } from '@/lib/splitTemplates';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { cn } from '@/lib/utils';
import { useWorkouts } from '@/hooks/useWorkouts';

function getDefaultDayForDate(date: Date, numDays: number): string | null {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) return null;
  if (dayOfWeek > numDays) return null;
  return `Day ${dayOfWeek}`;
}

interface DaySelectorWithCheckinProps {
  selectedDay: string;
  onSelect: (day: string, date: Date, weekNumber: number) => void;
}

export function DaySelectorWithCheckin({
  selectedDay,
  onSelect,
}: DaySelectorWithCheckinProps) {
  const { preferences } = useUserPreferences();
  const splitDays = preferences ? getSplitDays(preferences.training_split) : defaultRoutine.days;
  const days = Object.entries(splitDays);
  const { workouts } = useWorkouts();
  const selectedDate = new Date();

  const getWeekFromPastData = (): number => {
    if (!workouts || workouts.length === 0) return 1;
    const mostRecentWorkout = workouts[0];
    const lastWeek = mostRecentWorkout.week_number;
    const lastWorkoutDate = new Date(mostRecentWorkout.date).toDateString();
    const today = new Date().toDateString();
    if (lastWorkoutDate === today) return lastWeek;
    const lastWorkoutDateObj = new Date(mostRecentWorkout.date);
    const daysSince = Math.floor((Date.now() - lastWorkoutDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 7) return Math.min(12, lastWeek + 1);
    return lastWeek;
  };

  const [weekNumber, setWeekNumber] = useState<number>(1);

  useEffect(() => {
    setWeekNumber(getWeekFromPastData());
  }, [workouts]);

  useEffect(() => {
    const defaultDay = getDefaultDayForDate(selectedDate, days.length);
    if (defaultDay && !selectedDay && splitDays[defaultDay]) {
      onSelect(defaultDay, selectedDate, weekNumber);
    }
  }, [preferences]);

  const handleDaySelect = (dayKey: string) => {
    onSelect(dayKey, selectedDate, weekNumber);
  };

  const gridCols = days.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="space-y-5">
      <div className={cn("grid gap-2.5", gridCols)}>
        {days.map(([dayKey, dayData]) => {
          const isSelected = selectedDay === dayKey;
          return (
            <button
              key={dayKey}
              onClick={() => handleDaySelect(dayKey)}
              className={cn(
                'relative text-center p-4 rounded-xl transition-all active:scale-[0.97]',
                isSelected
                  ? 'bg-foreground text-background ring-2 ring-foreground ring-offset-2 ring-offset-background'
                  : 'bg-foreground text-background hover:opacity-90'
              )}
            >
              <div className="font-bold text-sm">{dayData.name}</div>
              <div className="text-[11px] opacity-60 mt-0.5 truncate">
                {dayData.focus}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
