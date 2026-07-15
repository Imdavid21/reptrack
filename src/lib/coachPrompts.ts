/**
 * In-app coach prompts (§4/§5, delivered as banners rather than push):
 *  - nothing logged today → log a session or mark a rest day
 *  - leg volume falling behind push/pull over a rolling 14 days (§3)
 *  - sleep/bodyweight gaps for 3+ consecutive days (§5)
 *  - protein under the 1.6 g/kg floor during a cut (§2.4)
 *
 * Pure over day-key strings so it's deterministic and testable.
 */

import { proteinBelowFloor, proteinTarget } from './deficitEngine';

const MS_PER_DAY = 86_400_000;
function keyToUTC(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}
function shiftKey(key: string, deltaDays: number): string {
  const dt = new Date(keyToUTC(key) + deltaDays * MS_PER_DAY);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}
function daysBetween(a: string, b: string): number {
  return Math.round((keyToUTC(a) - keyToUTC(b)) / MS_PER_DAY);
}

export type Category = 'push' | 'pull' | 'legs' | 'other';
export function categorize(dayName: string): Category {
  const n = (dayName || '').toLowerCase();
  if (n.includes('push')) return 'push';
  if (n.includes('pull')) return 'pull';
  if (n.includes('leg')) return 'legs';
  return 'other';
}

export interface CoachInput {
  todayKey: string;
  workouts: Array<{ date: string; day_name: string }>;
  metrics: Array<{ date: string; sleep_hours: number | null; bodyweight: number | null }>;
  deficitMode: boolean;
  avgProtein?: number;
  bodyweightKg?: number;
}

export interface CoachPrompt {
  id: 'no-activity' | 'leg-ratio' | 'log-gaps' | 'protein-floor';
  severity: 'info' | 'warn';
  title: string;
  detail: string;
}

/** legs must be ≥ (push+pull)/2 over the window, else it's behind. */
export function legRatioBehind(workouts: CoachInput['workouts'], todayKey: string): { behind: boolean; legs: number; upper: number } {
  let legs = 0, upper = 0;
  for (const w of workouts) {
    const diff = daysBetween(todayKey, w.date);
    if (diff < 0 || diff > 13) continue;
    const c = categorize(w.day_name);
    if (c === 'legs') legs += 1;
    else if (c === 'push' || c === 'pull') upper += 1;
  }
  return { behind: upper >= 2 && legs * 2 < upper, legs, upper };
}

export function buildCoachPrompts(input: CoachInput): CoachPrompt[] {
  const prompts: CoachPrompt[] = [];

  // Nothing logged today
  const loggedToday = input.workouts.some(w => w.date === input.todayKey);
  if (!loggedToday) {
    prompts.push({
      id: 'no-activity',
      severity: 'info',
      title: 'Nothing logged today',
      detail: 'Log your session, or mark today as a rest day.',
    });
  }

  // Leg volume behind push/pull
  const leg = legRatioBehind(input.workouts, input.todayKey);
  if (leg.behind) {
    prompts.push({
      id: 'leg-ratio',
      severity: 'warn',
      title: 'Leg volume is falling behind',
      detail: `${leg.legs} leg vs ${leg.upper} push/pull sessions in 14 days — schedule a leg day before your next upper session.`,
    });
  }

  // Sleep + bodyweight gaps for 3 consecutive days
  const hasMetric = (key: string) =>
    input.metrics.some(m => m.date === key && ((m.sleep_hours ?? 0) > 0 || (m.bodyweight ?? 0) > 0));
  const gapDays = [0, 1, 2].every(d => !hasMetric(shiftKey(input.todayKey, -d)));
  if (gapDays) {
    prompts.push({
      id: 'log-gaps',
      severity: 'info',
      title: 'Sleep & bodyweight logs have gaps',
      detail: 'No sleep or weight logged for 3 days — these matter most during a cut. Log tonight.',
    });
  }

  // Protein floor during a cut
  if (input.deficitMode && input.avgProtein && input.bodyweightKg &&
      proteinBelowFloor(input.avgProtein, input.bodyweightKg)) {
    const band = proteinTarget(input.bodyweightKg);
    prompts.push({
      id: 'protein-floor',
      severity: 'warn',
      title: 'Protein is under the cut floor',
      detail: `Averaging ${Math.round(input.avgProtein)}g (< 1.6 g/kg). Aim for ${band.min}-${band.max}g/day to hold muscle.`,
    });
  }

  return prompts;
}
