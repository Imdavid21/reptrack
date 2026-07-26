import { useUserPreferences } from './useUserPreferences';
import { useDailyMetrics } from './useDailyMetrics';
import { useDailyBurnTotals } from './useCalorieBurn';
import { resolveBodyweightKg } from '@/lib/workoutCalories';
import { computeAutoMaintenance, AutoMaintenanceResult } from '@/lib/metabolism';

const ACTIVITY_WINDOW_DAYS = 14;

export interface AutoMaintenance extends AutoMaintenanceResult {
  isLoading: boolean;
  /** False when profile is missing age/height/gender — nothing to compute from yet. */
  isAvailable: boolean;
}

/**
 * The body-based, auto-updating replacement for Deficit Mode's manually-typed
 * "maintenance calories": BMR (Mifflin-St Jeor) from the user's own latest
 * logged bodyweight + profile age/height/gender, plus a trailing 14-day
 * average of their actual logged workout/activity burn — not a fixed
 * "activity level" guess. Recomputes on every render, so a new weigh-in or a
 * more/less active couple of weeks shifts the number automatically.
 */
export function useAutoMaintenanceCalories(): AutoMaintenance {
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { data: metricsData, isLoading: metricsLoading } = useDailyMetrics({
    from: new Date(Date.now() - 30 * 86400000),
    to: new Date(),
  });
  const { data: burnTotals = [], isLoading: burnsLoading } = useDailyBurnTotals(ACTIVITY_WINDOW_DAYS);

  const age = preferences?.age;
  const heightCm = preferences?.height_cm;
  const gender = preferences?.gender;
  const isAvailable = !!age && !!heightCm && !!gender;

  if (!isAvailable) {
    return { bmr: 0, avgActivityBurn: 0, maintenance: 0, isAvailable: false, isLoading: prefsLoading };
  }

  const weightKg = resolveBodyweightKg(metricsData?.totals?.avgBodyweight, preferences?.weight_goal);
  const result = computeAutoMaintenance({
    weightKg,
    heightCm: heightCm as number,
    age: age as number,
    gender,
    activityBurnEntries: burnTotals,
    windowDays: ACTIVITY_WINDOW_DAYS,
  });

  return { ...result, isAvailable: true, isLoading: prefsLoading || metricsLoading || burnsLoading };
}
