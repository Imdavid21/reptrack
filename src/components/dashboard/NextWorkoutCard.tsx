/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { useLastUsedWeights } from '@/hooks/useLastUsedWeights';
import { useAdvancedMode } from '@/hooks/useAdvancedMode';
import type { WorkoutExercise } from '@/hooks/useWorkouts';
import { PPL_PROGRAM, PPL_SEQUENCE, resolveNextSession, SessionKey, sessionKeyFromWorkout } from '@/lib/adaptivePpl';
import { localDateKey } from '@/lib/dateKey';
import { haptic } from '@/lib/haptics';

const WORKING_PHASES = ['primary', 'compound', 'specialization', 'accessory', 'core'];
const storedSession = (userId: string): SessionKey | null => {
  const value = window.localStorage.getItem(`reptrack-next-session:${userId}`);
  return PPL_SEQUENCE.includes(value as SessionKey) ? value as SessionKey : null;
};
const rememberSession = (userId: string, value: SessionKey) => window.localStorage.setItem(`reptrack-next-session:${userId}`, value);
const exerciseType = (name: string): WorkoutExercise['exerciseType'] => /pull-?ups?|dips?|hanging|ab wheel|reverse crunch/i.test(name) ? 'bodyweight' : 'weighted';

export function NextWorkoutCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { saveDraft } = useDraftWorkout();
  const { getLastUsed } = useLastUsedWeights();
  const advanced = useAdvancedMode();
  const [key, setKey] = useState<SessionKey>('push_a');

  useEffect(() => {
    if (!user) return;
    const load = () => Promise.all([
      (supabase.from('training_state' as any) as any).select('next_session,updated_at').eq('user_id', user.id).maybeSingle(),
      (supabase.from('workouts') as any).select('session_key,day_name,completed_at').eq('user_id', user.id).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([state, latest]: any[]) => {
      const last = sessionKeyFromWorkout(latest.data?.session_key, latest.data?.day_name);
      const resolved = resolveNextSession({ persistedNextSession: state.data?.next_session, persistedUpdatedAt: state.data?.updated_at, latestCompletedSession: last, latestCompletedAt: latest.data?.completed_at, localFallback: storedSession(user.id) });
      const historyIsCurrent = !!last && resolved !== state.data?.next_session;
      setKey(resolved);
      rememberSession(user.id, resolved);
      if (historyIsCurrent && !state.error) void (supabase.from('training_state') as any).upsert({ user_id: user.id, next_session: resolved, updated_at: new Date().toISOString() });
    });
    void load();
    window.addEventListener('reptrack-training-state', load);
    return () => window.removeEventListener('reptrack-training-state', load);
  }, [user]);

  const session = PPL_PROGRAM[key];
  const working = session.exercises.filter(ex => WORKING_PHASES.includes(ex.phase));
  const preview = session.exercises.filter(ex => ['primary', 'compound', 'specialization'].includes(ex.phase)).slice(0, 4).map(ex => ex.name).join(' · ');

  const startNow = () => {
    if (!user || key === 'recovery') { navigate('/app/train'); return; }
    if (advanced.settings.enabled) { navigate('/app/lab/session'); return; }
    const startedAt = new Date();
    const exercises: WorkoutExercise[] = working.map((item, exerciseIndex) => {
      const last = getLastUsed(item.name);
      return {
        name: item.name, category: item.phase, sort_order: exerciseIndex, exerciseType: item.timed ? 'timed' : exerciseType(item.name), restSeconds: item.rest, rir: item.rir, progression: item.progression,
        sets: Array.from({ length: item.sets }, (_, setIndex) => {
          const previous = last?.perSet?.[setIndex] ?? (last ? { weight: last.weight, reps: last.reps } : undefined);
          const fallbackReps = item.reps.match(/\d+/)?.[0] || '8';
          return { setNumber: setIndex + 1, targetWeight: '', targetReps: item.reps, actualWeight: previous?.weight ? String(previous.weight) : '', actualReps: previous?.reps ? String(previous.reps) : fallbackReps, targetTime: item.timed ? Number(fallbackReps) : undefined, completed: false };
        }),
      };
    });
    saveDraft({ day: key, dayName: session.name, date: localDateKey(startedAt), weekNumber: 1, exercises, habits: { pullups: 0, water_intake: 0, sleep_hours: 0 }, currentExerciseIndex: 0, currentSetIndex: 0, step: 'exercises', resumePath: '/app/train', saveId: crypto.randomUUID(), workoutStartTime: startedAt.toISOString(), elapsedSeconds: 0, pausedSeconds: 0, pauseIntervals: [] });
    haptic('medium');
    navigate('/app/train');
  };

  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card overflow-hidden">
    <div className="p-5">
      <div className="flex items-center justify-between gap-3"><div className="type-eyebrow">{key === 'recovery' ? 'Recovery day' : 'Next workout'}</div>{advanced.settings.enabled && <span className="rounded-lg bg-muted px-2 py-1 type-meta">Advanced</span>}</div>
      <div className="flex items-end justify-between gap-3 mt-1"><div><div className="type-section-title">{session.name}</div><div className="type-supporting mt-1">About {session.duration} min</div></div><span className="type-caption">Next in sequence</span></div>
      <p className="type-supporting mt-4 line-clamp-2">{preview || session.objective}</p>
    </div>
    <button onClick={startNow} className="w-full bg-foreground text-background py-4 flex items-center justify-center gap-2 font-bold text-sm active:opacity-80"><Play className="h-4 w-4" fill="currentColor" />{key === 'recovery' ? 'View recovery options' : advanced.settings.enabled ? 'Review & start' : 'Start workout'}<ArrowRight className="h-4 w-4" /></button>
  </motion.div>;
}
