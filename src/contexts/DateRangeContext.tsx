import { createContext, useContext, useState, ReactNode } from 'react';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeContextType {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  preset: string;
  setPreset: (preset: string) => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export const DATE_PRESETS = [
  { label: 'Last 7 days', value: '7d', days: 6 },
  { label: 'Last 14 days', value: '14d', days: 13 },
  { label: 'Last 30 days', value: '30d', days: 29 },
  { label: 'Last 60 days', value: '60d', days: 59 },
  { label: 'Last 90 days', value: '90d', days: 89 },
  { label: 'Last 2 years', value: 'all', days: 365 * 2 - 1 },
] as const;

interface DateRangeProviderProps {
  children: ReactNode;
  storageKey?: string;
  defaultPreset?: string;
}

export function DateRangeProvider({
  children,
  storageKey = 'insights-date-range-preset',
  defaultPreset = '30d',
}: DateRangeProviderProps) {
  const resolvePreset = () => {
    const saved = localStorage.getItem(storageKey);
    return DATE_PRESETS.some(p => p.value === saved) ? saved! : defaultPreset;
  };

  const [preset, setPreset] = useState(resolvePreset);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const selected = resolvePreset();
    const presetConfig = DATE_PRESETS.find(p => p.value === selected) ?? DATE_PRESETS[2];
    return {
      from: startOfDay(subDays(new Date(), presetConfig.days)),
      to: endOfDay(new Date()),
    };
  });

  const handleSetPreset = (newPreset: string) => {
    const presetConfig = DATE_PRESETS.find(p => p.value === newPreset);
    if (!presetConfig) return;
    setPreset(newPreset);
    localStorage.setItem(storageKey, newPreset);
    setDateRange({
      from: startOfDay(subDays(new Date(), presetConfig.days)),
      to: endOfDay(new Date()),
    });
  };

  return (
    <DateRangeContext.Provider
      value={{
        dateRange,
        setDateRange,
        preset,
        setPreset: handleSetPreset,
      }}
    >
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}
