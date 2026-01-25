import { useState } from 'react';
import { defaultRoutine } from '@/lib/workoutPresets';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar, Zap, Target, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface PreWorkoutData {
  energy: number;
  motivation: number;
  soreness: number;
}

interface DaySelectorWithCheckinProps {
  selectedDay: string;
  preCheckin: PreWorkoutData;
  onSelect: (day: string, date: Date, weekNumber: number) => void;
  onPreCheckinChange: (data: PreWorkoutData) => void;
  onQuickLog?: () => void;
}

const EMOJI_SCALE = ['😴', '😐', '🙂', '😊', '🔥'];

function getEmoji(value: number, inverted?: boolean): string {
  const v = inverted ? 11 - value : value;
  const index = Math.min(Math.floor((v - 1) / 2), 4);
  return EMOJI_SCALE[index];
}

export function DaySelectorWithCheckin({ 
  selectedDay, 
  preCheckin,
  onSelect, 
  onPreCheckinChange,
  onQuickLog 
}: DaySelectorWithCheckinProps) {
  const days = Object.entries(defaultRoutine.days);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showCheckin, setShowCheckin] = useState(true);

  const handleDaySelect = (dayKey: string) => {
    onSelect(dayKey, selectedDate, weekNumber);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  const handleCheckinChange = (field: keyof PreWorkoutData, value: number) => {
    onPreCheckinChange({ ...preCheckin, [field]: value });
  };

  const checkinMetrics = [
    { key: 'energy' as const, label: 'ENERGY', icon: Zap, lowLabel: 'Low', highLabel: 'High' },
    { key: 'motivation' as const, label: 'MOTIVATION', icon: Target, lowLabel: 'Low', highLabel: 'Pumped' },
    { key: 'soreness' as const, label: 'SORENESS', icon: Activity, lowLabel: 'Fresh', highLabel: 'Sore', inverted: true },
  ];

  return (
    <div className="space-y-4">
      {/* Date & Week Row */}
      <div className="grid grid-cols-2 gap-2">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <button className="btn-brutalist text-left p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground mb-1">DATE</div>
                <div className="font-bold">{format(selectedDate, 'MMM d, yyyy')}</div>
              </div>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <div className="btn-brutalist p-4">
          <div className="text-xs text-muted-foreground mb-1">WEEK</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekNumber(Math.max(1, weekNumber - 1))}
              className="h-8 w-8 flex items-center justify-center hover:bg-muted transition-colors"
            >
              -
            </button>
            <span className="font-bold text-xl tabular-nums w-8 text-center">
              {weekNumber}
            </span>
            <button
              onClick={() => setWeekNumber(Math.min(12, weekNumber + 1))}
              className="h-8 w-8 flex items-center justify-center hover:bg-muted transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Pre-Workout Check-in */}
      <Collapsible open={showCheckin} onOpenChange={setShowCheckin}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 border border-border bg-card hover:bg-muted/50 transition-colors">
          <span className="text-xs font-medium text-muted-foreground">PRE-WORKOUT CHECK-IN</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {checkinMetrics.map(({ key, inverted }) => (
                <span key={key} className="text-lg">{getEmoji(preCheckin[key], inverted)}</span>
              ))}
            </div>
            {showCheckin ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="border border-t-0 border-border p-4 space-y-4 animate-accordion-down">
          {checkinMetrics.map(({ key, label, icon: Icon, lowLabel, highLabel, inverted }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getEmoji(preCheckin[key], inverted)}</span>
                  <span className="font-bold tabular-nums w-6 text-right">{preCheckin[key]}</span>
                </div>
              </div>
              <Slider
                value={[preCheckin[key]]}
                onValueChange={([v]) => handleCheckinChange(key, v)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{lowLabel}</span>
                <span>{highLabel}</span>
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Workout Day Grid */}
      <div className="space-y-2">
        <h3 className="section-header">SELECT WORKOUT</h3>
        <div className="grid grid-cols-2 gap-2">
          {days.map(([dayKey, dayData]) => (
            <button
              key={dayKey}
              onClick={() => handleDaySelect(dayKey)}
              className={cn(
                'btn-brutalist text-left p-4 transition-all',
                selectedDay === dayKey && 'btn-primary'
              )}
            >
              <div className="text-xs text-muted-foreground mb-1">
                {dayKey.toUpperCase()}
              </div>
              <div className="font-bold">{dayData.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {dayData.focus}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Log Option */}
      {onQuickLog && (
        <button
          onClick={onQuickLog}
          className="w-full border border-dashed border-muted-foreground/50 py-3 text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
        >
          QUICK LOG (SKIP EXERCISES)
        </button>
      )}
    </div>
  );
}
