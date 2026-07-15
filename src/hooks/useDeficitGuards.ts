import { useMemo } from 'react';
import { useWorkouts } from './useWorkouts';
import { useUserPreferences } from './useUserPreferences';
import { computeDeficitGuards, DeficitGuards } from '@/lib/deficitEngine';
import { localDateKey } from '@/lib/dateKey';

/**
 * Deficit-mode training guards for the log screen: whether the 5-session/week
 * cap is reached and whether a rest day is due (5+ consecutive training days).
 * Only meaningful when deficit mode is on.
 */
export function useDeficitGuards(): DeficitGuards & { deficitMode: boolean } {
  const { workouts } = useWorkouts();
  const { preferences } = useUserPreferences();
  const deficitMode = preferences?.deficit_mode_enabled ?? false;

  const guards = useMemo(
    () => computeDeficitGuards(workouts.map(w => w.date), localDateKey()),
    [workouts],
  );

  return { ...guards, deficitMode };
}
