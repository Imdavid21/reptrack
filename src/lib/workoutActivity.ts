export const MAX_WORKOUT_MINUTES = 600;

export function validWorkoutMinutes(value: unknown): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0 && minutes <= MAX_WORKOUT_MINUTES ? minutes : 0;
}

/** Preserve the activity ID when a workout moves to another date. */
export async function saveWorkoutActivity(db: any, payload: Record<string, any>): Promise<void> {
  const { data, error } = await db.from('calorie_burns').select('id')
    .eq('user_id', payload.user_id).eq('source', 'workout')
    .eq('activity_type', payload.activity_type).maybeSingle();
  if (error) throw error;
  const result = data
    ? await db.from('calorie_burns').update(payload).eq('id', data.id)
    : await db.from('calorie_burns').insert(payload);
  if (result.error?.code === '23505' && !data) return saveWorkoutActivity(db, payload);
  if (result.error) throw result.error;
}