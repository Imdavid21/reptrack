/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PPL_PROGRAM, PPL_SEQUENCE, resolveNextSession, SessionKey, sessionKeyFromWorkout } from '@/lib/adaptivePpl';
import { haptic } from '@/lib/haptics';

const storedSession = (userId: string): SessionKey | null => {
  const value = window.localStorage.getItem(`reptrack-next-session:${userId}`);
  return PPL_SEQUENCE.includes(value as SessionKey) ? value as SessionKey : null;
};
const rememberSession = (userId: string, value: SessionKey) => window.localStorage.setItem(`reptrack-next-session:${userId}`, value);

export function NextWorkoutCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [key, setKey] = useState<SessionKey>('push_a');

  useEffect(() => {
    if (!user) return;
    const load = () => Promise.all([
      (supabase.from('training_state' as any) as any).select('next_session,updated_at').eq('user_id', user.id).maybeSingle(),
      (supabase.from('workouts') as any).select('session_key,day_name,completed_at').eq('user_id', user.id).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([state, latest]: any[]) => {
      const last = sessionKeyFromWorkout(latest.data?.session_key, latest.data?.day_name);
      const resolved = resolveNextSession({
        persistedNextSession: state.data?.next_session,
        persistedUpdatedAt: state.data?.updated_at,
        latestCompletedSession: last,
        latestCompletedAt: latest.data?.completed_at,
        localFallback: storedSession(user.id),
      });
      const historyIsCurrent = !!last && resolved !== state.data?.next_session;
      setKey(resolved);
      rememberSession(user.id, resolved);
      if (historyIsCurrent && !state.error) {
        void (supabase.from('training_state') as any).upsert({ user_id: user.id, next_session: resolved, updated_at: new Date().toISOString() });
      }
    });
    void load();
    window.addEventListener('reptrack-training-state', load);
    return () => window.removeEventListener('reptrack-training-state', load);
  }, [user]);

  const session = PPL_PROGRAM[key];
  const working = session.exercises.filter(ex => ['primary', 'compound', 'specialization', 'accessory', 'core'].includes(ex.phase));
  const workingSets = working.reduce((sum, exercise) => sum + exercise.sets, 0);
  const focus = session.objective.split(',').slice(0, 2).join(',');

  if (key === 'recovery') {
    return <section className="rounded-[24px] border border-border bg-card p-5"><div className="type-eyebrow">Recovery day</div><h2 className="type-section-title mt-1">Nothing required.</h2><p className="type-supporting mt-2">Easy movement or mobility is available in Train if you want it.</p><button onClick={() => navigate('/app/train')} className="mt-4 min-h-11 text-sm font-semibold underline underline-offset-4">View recovery options</button></section>;
  }

  return <section className="rounded-[24px] border border-border bg-card overflow-hidden">
    <div className="p-5">
      <div className="type-eyebrow">Next workout</div>
      <div className="mt-1 flex items-start justify-between gap-4"><div><h2 className="type-section-title">{session.name}</h2><p className="type-supporting mt-1">{focus}</p></div><div className="text-right type-caption shrink-0"><div>~{session.duration} min</div><div className="mt-1">{working.length} exercises · {workingSets} sets</div></div></div>
    </div>
    <button onClick={() => { haptic('medium'); navigate('/app/train'); }} className="w-full min-h-14 bg-foreground text-background px-4 flex items-center justify-center gap-2 font-bold text-sm active:opacity-80"><Play className="h-4 w-4" fill="currentColor"/>Start {session.name}<ArrowRight className="h-4 w-4"/></button>
  </section>;
}
