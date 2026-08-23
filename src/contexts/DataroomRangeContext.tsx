import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import type { DateRange } from './DateRangeContext';

export type DataroomRangeKey = '7D' | '30D' | '3M' | '6M' | '1Y';

export const DATAROOM_RANGE_DAYS: Record<DataroomRangeKey, number> = {
  '7D': 7,
  '30D': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

export const DATAROOM_RANGE_OPTIONS: DataroomRangeKey[] = ['7D', '30D', '3M', '6M', '1Y'];
const STORAGE_KEY = 'reptrack-dataroom-range';

interface DataroomRangeValue {
  range: DataroomRangeKey;
  setRange: (range: DataroomRangeKey) => void;
  days: number;
  dateRange: DateRange;
}

const DataroomRangeContext = createContext<DataroomRangeValue | undefined>(undefined);

function initialRange(): DataroomRangeKey {
  if (typeof window === 'undefined') return '30D';
  const stored = window.localStorage.getItem(STORAGE_KEY) as DataroomRangeKey | null;
  return stored && DATAROOM_RANGE_OPTIONS.includes(stored) ? stored : '30D';
}

export function DataroomRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<DataroomRangeKey>(initialRange);
  const days = DATAROOM_RANGE_DAYS[range];
  const dateRange = useMemo<DateRange>(() => {
    const to = endOfDay(new Date());
    return { from: startOfDay(subDays(to, days - 1)), to };
  }, [days]);

  const setRange = (next: DataroomRangeKey) => {
    setRangeState(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next);
  };

  return <DataroomRangeContext.Provider value={{ range, setRange, days, dateRange }}>{children}</DataroomRangeContext.Provider>;
}

export function useDataroomRange() {
  const value = useContext(DataroomRangeContext);
  if (!value) throw new Error('useDataroomRange must be used within DataroomRangeProvider');
  return value;
}
