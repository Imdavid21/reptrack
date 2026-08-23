/**
 * Evaluates in-session cues that an assistant set through the MCP server.
 * Pure logic so it can be unit tested without a live session.
 */
export type TriggerConditionType =
  | 'exercise_started'
  | 'weight_at_least'
  | 'reps_at_least'
  | 'elapsed_minutes'
  | 'completed_sets'
  | 'session_volume';

export interface WorkoutTrigger {
  id: string;
  condition_type: TriggerConditionType | string;
  exercise_name: string | null;
  comparator: string;
  threshold: number | null;
  message: string;
  status: string;
  repeat_mode: string;
  fired_count?: number;
  expires_at?: string | null;
}

export interface SessionSnapshot {
  currentExercise: string;
  lastSetWeight: number | null;
  lastSetReps: number | null;
  elapsedMinutes: number;
  completedSets: number;
  totalVolume: number;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function compare(comparator: string, value: number, threshold: number): boolean {
  return comparator === 'lte' ? value <= threshold : value >= threshold;
}

function matchesExercise(trigger: WorkoutTrigger, snapshot: SessionSnapshot): boolean {
  if (!trigger.exercise_name) return true;
  const target = normalize(trigger.exercise_name);
  const current = normalize(snapshot.currentExercise || '');
  if (!target || !current) return false;
  return current.includes(target) || target.includes(current);
}

export function triggerFires(trigger: WorkoutTrigger, snapshot: SessionSnapshot): boolean {
  if (trigger.status !== 'active') return false;
  if (trigger.repeat_mode !== 'always' && (trigger.fired_count ?? 0) > 0) return false;
  if (trigger.expires_at && Date.parse(trigger.expires_at) < Date.now()) return false;

  const threshold = trigger.threshold;
  switch (trigger.condition_type) {
    case 'exercise_started':
      return matchesExercise(trigger, snapshot);
    case 'weight_at_least':
      return threshold != null && matchesExercise(trigger, snapshot)
        && snapshot.lastSetWeight != null && compare(trigger.comparator, snapshot.lastSetWeight, threshold);
    case 'reps_at_least':
      return threshold != null && matchesExercise(trigger, snapshot)
        && snapshot.lastSetReps != null && compare(trigger.comparator, snapshot.lastSetReps, threshold);
    case 'elapsed_minutes':
      return threshold != null && compare(trigger.comparator, snapshot.elapsedMinutes, threshold);
    case 'completed_sets':
      return threshold != null && compare(trigger.comparator, snapshot.completedSets, threshold);
    case 'session_volume':
      return threshold != null && compare(trigger.comparator, snapshot.totalVolume, threshold);
    default:
      return false;
  }
}

/** The cues to surface for a snapshot, in creation order. */
export function evaluateTriggers(triggers: WorkoutTrigger[], snapshot: SessionSnapshot): WorkoutTrigger[] {
  return triggers.filter(trigger => triggerFires(trigger, snapshot));
}
