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

// Presets for quick selection
export const DATE_PRESETS = [
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 14 days', value: '14d', days: 14 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 60 days', value: '60d', days: 60 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'All time', value: 'all', days: 365 * 2 },
];

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Default to all time
    return {
      from: startOfDay(subDays(new Date(), 365 * 2)),
      to: endOfDay(new Date()),
    };
  });

  const handleSetPreset = (newPreset: string) => {
    setPreset(newPreset);
    const presetConfig = DATE_PRESETS.find(p => p.value === newPreset);
    if (presetConfig) {
      setDateRange({
        from: startOfDay(subDays(new Date(), presetConfig.days)),
        to: endOfDay(new Date()),
      });
    }
  };

  return (
    <DateRangeContext.Provider 
      value={{ 
        dateRange, 
        setDateRange, 
        preset, 
        setPreset: handleSetPreset 
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
