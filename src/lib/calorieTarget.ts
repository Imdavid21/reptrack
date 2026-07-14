/**
 * Calorie target math for the homepage "calories left to burn today" hero.
 *
 * net       = eaten - burned (workouts + logged activity)
 * goal      = the effective daily target (deficit-adjusted when deficit_mode is on)
 * burnNeeded      = max(0, net - goal)  → activity kcal required to hit target today
 * remainingBudget = max(0, goal - net) → kcal that can still be eaten before extra
 *                                        activity would be needed
 */

export interface CalorieTargetInput {
  eaten: number;
  burned: number;
  /** daily_calorie_goal preference. */
  dailyGoal: number;
  /** deficit_mode_enabled. */
  deficitMode: boolean;
  /** daily_deficit_target. */
  deficitTarget: number;
  /** maintenance_calories (null → derived as dailyGoal + deficitTarget). */
  maintenance: number | null;
}

export interface CalorieTarget {
  /** Effective daily target (matches the app's `cap`). */
  goal: number;
  /** eaten - burned. */
  net: number;
  /** Activity burn still needed to reach the target (0 if already under). */
  burnNeeded: number;
  /** Eating budget left before extra activity is needed (0 if already over). */
  remainingBudget: number;
  /** Whether net is at or under the goal. */
  onTrack: boolean;
}

export function computeCalorieTarget(i: CalorieTargetInput): CalorieTarget {
  const maintenance = i.maintenance ?? (i.dailyGoal + i.deficitTarget);
  // Effective target: in deficit mode, maintenance minus the deficit (floored),
  // otherwise the plain calorie goal. Mirrors CalorieTrackerCompact's `cap`.
  const goal = i.deficitMode ? Math.max(maintenance - i.deficitTarget, 800) : i.dailyGoal;
  const net = i.eaten - i.burned;
  const burnNeeded = Math.max(0, net - goal);
  const remainingBudget = Math.max(0, goal - net);
  return { goal, net, burnNeeded, remainingBudget, onTrack: net <= goal };
}
