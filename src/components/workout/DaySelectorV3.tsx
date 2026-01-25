import { useState } from 'react';
import { format } from 'date-fns';
import { defaultRoutine } from '@/lib/workoutPresets';
import { cn } from '@/lib/utils';

export interface PreWorkoutData {
  energy: number;
  motivation: number;
  soreness: number;
}

interface DaySelectorV3Props {
  preCheckin: PreWorkoutData;
  onSelect: (day: string, date: Date, weekNumber: number) => void;
  onPreCheckinChange: (data: PreWorkoutData) => void;
}

const RATINGS = [1, 2, 3, 4, 5];

export function DaySelectorV3({ 
  preCheckin,
  onSelect, 
  onPreCheckinChange,
}: DaySelectorV3Props) {
  const days = Object.entries(defaultRoutine.days);
  const [selectedDate] = useState<Date>(new Date());
  const [weekNumber, setWeekNumber] = useState<number>(1);

  const handleDaySelect = (dayKey: string) => {
    onSelect(dayKey, selectedDate, weekNumber);
  };

  const handleRatingChange = (field: keyof PreWorkoutData, value: number) => {
    onPreCheckinChange({ ...preCheckin, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Date header */}
      <div className="text-center">
        <div className="text-h1 font-bold">{format(selectedDate, 'EEEE').toUpperCase()}</div>
        <div className="label-v3">{format(selectedDate, 'MMMM d, yyyy').toUpperCase()}</div>
      </div>

      <div className="divider-v3" />

      {/* Week selector */}
      <div className="flex items-center justify-between">
        <div className="label-v3">WEEK</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekNumber(Math.max(1, weekNumber - 1))}
            className="btn-v3 px-3 py-1"
          >
            −
          </button>
          <span className="font-bold text-xl tabular-nums w-8 text-center">
            {weekNumber}
          </span>
          <button
            onClick={() => setWeekNumber(Math.min(12, weekNumber + 1))}
            className="btn-v3 px-3 py-1"
          >
            +
          </button>
        </div>
      </div>

      <div className="divider-v3" />

      {/* Pre-workout check-in */}
      <div className="space-y-4">
        <div className="label-v3">PRE-WORKOUT CHECK-IN (OPTIONAL)</div>
        
        {/* Energy */}
        <div className="flex items-center justify-between">
          <span className="text-sm">ENERGY</span>
          <div className="flex gap-1">
            {RATINGS.map(r => (
              <button
                key={r}
                onClick={() => handleRatingChange('energy', r)}
                className={cn(
                  "toggle-v3 w-8 h-8",
                  preCheckin.energy === r && "toggle-v3-selected"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Motivation */}
        <div className="flex items-center justify-between">
          <span className="text-sm">MOTIVATION</span>
          <div className="flex gap-1">
            {RATINGS.map(r => (
              <button
                key={r}
                onClick={() => handleRatingChange('motivation', r)}
                className={cn(
                  "toggle-v3 w-8 h-8",
                  preCheckin.motivation === r && "toggle-v3-selected"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Soreness */}
        <div className="flex items-center justify-between">
          <span className="text-sm">SORENESS</span>
          <div className="flex gap-1">
            {RATINGS.map(r => (
              <button
                key={r}
                onClick={() => handleRatingChange('soreness', r)}
                className={cn(
                  "toggle-v3 w-8 h-8",
                  preCheckin.soreness === r && "toggle-v3-selected"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divider-v3" />

      {/* Workout selection */}
      <div className="space-y-2">
        <div className="label-v3">SELECT WORKOUT</div>
        <div className="grid grid-cols-2 gap-2">
          {days.map(([dayKey, dayData]) => (
            <button
              key={dayKey}
              onClick={() => handleDaySelect(dayKey)}
              className="btn-v3 text-left p-4"
            >
              <div className="label-v3 mb-1">{dayKey.toUpperCase()}</div>
              <div className="font-bold">{dayData.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {dayData.focus}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
