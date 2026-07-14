import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { isToday } from 'date-fns';
import { localDateKey } from '@/lib/dateKey';

interface LogDateValue {
  /** The date the dashboard is viewing / logging to. */
  logDate: Date;
  setLogDate: (d: Date) => void;
  /** True when logDate is not today. */
  isBackDated: boolean;
  /** logDate as a yyyy-MM-dd key (local). */
  dateStr: string;
}

const LogDateContext = createContext<LogDateValue>({
  logDate: new Date(),
  setLogDate: () => {},
  isBackDated: false,
  dateStr: localDateKey(),
});

/**
 * A single shared "log date" for the whole dashboard. One control on the home
 * screen sets it; every tracker (water, food, activity, sleep, weight) reads it
 * for both display and logging. Defaults to today and resets when the dashboard
 * remounts, so back-dating is always a deliberate, transient action.
 */
export function LogDateProvider({ children }: { children: ReactNode }) {
  const [logDate, setLogDate] = useState<Date>(new Date());
  const value = useMemo<LogDateValue>(
    () => ({ logDate, setLogDate, isBackDated: !isToday(logDate), dateStr: localDateKey(logDate) }),
    [logDate],
  );
  return <LogDateContext.Provider value={value}>{children}</LogDateContext.Provider>;
}

export function useLogDate() {
  return useContext(LogDateContext);
}
