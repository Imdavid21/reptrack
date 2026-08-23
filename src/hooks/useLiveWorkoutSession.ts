import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { evaluateTriggers, type SessionSnapshot, type WorkoutTrigger } from '@/lib/workoutTriggers';
import type { WorkoutExercise } from '@/hooks/useWorkouts';

interface LivePublishInput {
  active: boolean;
  date: string;
  day: string;
  dayName: string;
  exercises: WorkoutExercise[];
  exerciseIndex: number;
  setIndex: number;
  elapsedSeconds: number;
  startedAt?: string | null;
}

const num = (value: unknown) => {
  const n = Number(String(value ?? '').match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(n) ? n : null;
};

function snapshotOf(input: LivePublishInput): SessionSnapshot & { completedSets: number; totalSets: number; totalVolume: number } {
  const sets = input.exercises.flatMap(ex => ex.sets.map(set => ({ ...set, exercise: ex.name })));
  const done = sets.filter(set => set.completed);
  const last = done[done.length - 1];
  const totalVolume = done.reduce((sum, set) => sum + (num(set.actualReps) ?? 0) * (num(set.actualWeight) ?? 0), 0);
  return {
    currentExercise: input.exercises[input.exerciseIndex]?.name ?? '',
    lastSetWeight: last ? num(last.actualWeight) : null,
    lastSetReps: last ? num(last.actualReps) : null,
    elapsedMinutes: Math.floor(input.elapsedSeconds / 60),
    completedSets: done.length,
    totalSets: sets.length,
    totalVolume: Math.round(totalVolume),
  };
}

/**
 * Mirrors the in-progress session into `live_workout_sessions` so ChatGPT can
 * read it over MCP, and surfaces any cue the assistant armed for this session.
 */
export function useLiveWorkoutSession(input: LivePublishInput) {
  const { user } = useAuth();
  const [triggers, setTriggers] = useState<WorkoutTrigger[]>([]);
  const [cue, setCue] = useState<WorkoutTrigger | null>(null);
  const [coachNote, setCoachNote] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const dismissedNote = useRef<string | null>(null);
  const lastPayload = useRef<string>('');

  const { active } = input;

  // Load the cues the assistant set, and refresh them periodically while training.
  useEffect(() => {
    if (!user || !active) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from('workout_triggers').select('*').eq('user_id', user.id).eq('status', 'active');
      if (!cancelled) setTriggers((data as unknown as WorkoutTrigger[]) ?? []);
    };
    load();
    const id = window.setInterval(load, 30_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [user, active]);

  // Publish the session snapshot (throttled by payload equality).
  useEffect(() => {
    if (!user || !active) return;
    const snap = snapshotOf(input);
    const payload = {
      user_id: user.id,
      date: input.date,
      day: input.day,
      day_name: input.dayName,
      status: 'active',
      current_exercise: snap.currentExercise,
      current_exercise_index: input.exerciseIndex,
      current_set_index: input.setIndex,
      completed_sets: snap.completedSets,
      total_sets: snap.totalSets,
      total_volume: snap.totalVolume,
      elapsed_seconds: input.elapsedSeconds,
      exercises: input.exercises as unknown as never,
      started_at: input.startedAt ?? new Date().toISOString(),
      ended_at: null,
    };
    const fingerprint = JSON.stringify({ ...payload, elapsed_seconds: Math.floor(input.elapsedSeconds / 15) });
    if (fingerprint === lastPayload.current) return;
    lastPayload.current = fingerprint;
    void supabase.from('live_workout_sessions').upsert(payload, { onConflict: 'user_id' }).then(({ error }) => {
      if (error) console.warn('[live-session] publish failed:', error.message);
    });
  }, [user, active, input]);

  // Pull any coach note the assistant pushed into the live row.
  useEffect(() => {
    if (!user || !active) return;
    let cancelled = false;
    const poll = async () => {
      const { data } = await supabase.from('live_workout_sessions').select('coach_note').eq('user_id', user.id).maybeSingle();
      const note = (data as { coach_note?: string | null } | null)?.coach_note ?? null;
      if (!cancelled && note && note !== dismissedNote.current) setCoachNote(note);
    };
    poll();
    const id = window.setInterval(poll, 20_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [user, active]);

  // Evaluate cues after every state change.
  useEffect(() => {
    if (!active || cue || !triggers.length) return;
    const snap = snapshotOf(input);
    const fired = evaluateTriggers(triggers, snap).find(t => !seen.current.has(t.id));
    if (!fired) return;
    seen.current.add(fired.id);
    setCue(fired);
    void supabase.from('workout_triggers').update({
      status: fired.repeat_mode === 'always' ? 'active' : 'fired',
      fired_at: new Date().toISOString(),
      fired_count: (fired.fired_count ?? 0) + 1,
    }).eq('id', fired.id);
  }, [active, cue, triggers, input]);

  const dismissCue = useCallback(() => {
    if (cue) void supabase.from('workout_triggers').update({ acknowledged_at: new Date().toISOString() }).eq('id', cue.id);
    setCue(null);
  }, [cue]);

  const dismissNote = useCallback(() => {
    dismissedNote.current = coachNote;
    setCoachNote(null);
    if (user) void supabase.from('live_workout_sessions').update({ coach_note: null }).eq('user_id', user.id);
  }, [coachNote, user]);

  const endSession = useCallback(async () => {
    if (!user) return;
    await supabase.from('live_workout_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('user_id', user.id);
    lastPayload.current = '';
  }, [user]);

  return { cue, coachNote, dismissCue, dismissNote, endSession };
}
