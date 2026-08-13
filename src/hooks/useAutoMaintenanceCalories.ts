import { useUserPreferences } from './useUserPreferences';
import { useDailyMetrics } from './useDailyMetrics';
import { resolveBodyweightKg } from '@/lib/workoutCalories';
import { calculateBMR, estimateBaselineMaintenance } from '@/lib/metabolism';

export interface AutoMaintenance {
  bmr: number;
  /** Baseline daily maintenance excluding separately logged activity. */
  maintenance: number;
  isLoading: boolean;
  /** False when profile is missing age/height/gender — nothing to compute from yet. */
  isAvailable: boolean;
}

/**
 * The body-based, auto-updating replacement for Deficit Mode's manually-typed
 * maintenance baseline: BMR (Mifflin-St Jeor) from the user's own bodyweight
 * (a trailing 30-day average, smoothing day-to-day water-weight noise) +
 * profile age/height/gender. Recomputes on every render, so a new weigh-in
 * shifts the number automatically — nothing to remember to re-enter. Today's
 * actual activity is credited separately and in real time by the caller
 * (netDeficit's `+ totalBurned`), not assumed here from history.
 */
export function useAutoMaintenanceCalories(): AutoMaintenance {
  const { preferences, isLoading: prefsLoading } = useUserPreferences();
  const { data: metricsData, isLoading: metricsLoading } = useDailyMetrics({
    from: new Date(Date.now() - 30 * 86400000),
    to: new Date(),
  });

  const age = preferences?.age;
  const heightCm = preferences?.height_cm;
  const gender = preferences?.gender;
  const isAvailable = !!age && !!heightCm && !!gender;

  if (!isAvailable) {
    return { bmr: 0, maintenance: 0, isAvailable: false, isLoading: prefsLoading };
  }

  const weightKg = resolveBodyweightKg(metricsData?.totals?.avgBodyweight, preferences?.weight_goal);
  const bmr = calculateBMR(weightKg, heightCm as number, age as number, gender);

  return { bmr, maintenance: estimateBaselineMaintenance(bmr, preferences?.activity_level), isAvailable: true, isLoading: prefsLoading || metricsLoading };
}
