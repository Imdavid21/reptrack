import { useState, useEffect, useMemo } from 'react';
import { resolveSplitDays } from '@/lib/splitTemplates';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { cn } from '@/lib/utils';
import { useWorkouts } from '@/hooks/useWorkouts';
import { Check } from 'lucide-react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { parseDateKey } from '@/lib/dateKey';

function getDefaultDayForDate(date: Date, numDays: number): string | null {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) return null;
  if (dayOfWeek > numDays) return null;
  return `Day ${dayOfWeek}`;
}

interface DaySelectorWithCheckinProps {
  selectedDay: string;
  onSelect: (day: string, date: Date, weekNumber: number) => void;
  /** The date the workout is being logged for (supports back-dating). */
  selectedDate?: Date;
}

export function DaySelectorWithCheckin({
  selectedDay,
  onSelect,
  selectedDate: selectedDateProp,
}: DaySelectorWithCheckinProps) {
  const { preferences } = useUserPreferences();
  // Same resolution splitTemplates.ts's resolveSplitDays uses everywhere else,
  // so this never shows different exercises than the day picker will once
  // preferences finish loading - it used to fall back to workoutPresets.ts's
  // separately-authored phase1Routine, whose Day 1 "Push A" is entirely
  // different exercises/weights than the real ppl6 template's Push A.
  const splitDays = resolveSplitDays(preferences?.training_split, null, false);
  const days = Object.entries(splitDays);
  const { workouts } = useWorkouts();
  const selectedDate = selectedDateProp ?? new Date();

  // Track which day_names have been completed this week
  const completedDayNames = useMemo(() => {
    if (!workouts || workouts.length === 0) return new Set<string>();
    
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const thisWeek = workouts.filter(w => {
      const d = parseDateKey(w.date);
      return d >= weekStart && d <= weekEnd;
    });

    return new Set(thisWeek.map(w => w.day_name));
  }, [workouts]);

  const getWeekFromPastData = (): number => {
    if (!workouts || workouts.length === 0) return 1;
    const mostRecentWorkout = workouts[0];
    const lastWeek = mostRecentWorkout.week_number;
    const lastWorkoutDate = parseDateKey(mostRecentWorkout.date).toDateString();
    const today = new Date().toDateString();
    if (lastWorkoutDate === today) return lastWeek;
    const lastWorkoutDateObj = parseDateKey(mostRecentWorkout.date);
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
          const isDoneThisWeek = completedDayNames.has(dayData.name);
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
              {/* Completion badge */}
              {isDoneThisWeek && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-background/20 flex items-center justify-center">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
              <div className="font-bold text-sm">{dayData.name}</div>
              <div className="text-xs opacity-60 mt-0.5 truncate">
                {dayData.focus}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
