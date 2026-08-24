import { useMemo } from 'react';
import { subDays } from 'date-fns';
import { ChevronRight, CircleCheck, Gauge, History, TriangleAlert } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAdvancedMode } from '@/hooks/useAdvancedMode';
import { useCoachEvents } from '@/hooks/useCoachEvents';
import { useDataroomData } from '@/hooks/useDataroomData';
import { useNavigate } from 'react-router-dom';

function number(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function FlightRecorder() {
  const navigate = useNavigate();
  const { settings } = useAdvancedMode();
  const events = useCoachEvents(30);
  const range = useMemo(() => ({ from: subDays(new Date(), 89), to: new Date() }), []);
  const data = useDataroomData(range);

  const sessions = useMemo(() => data.workouts
    .filter(workout => workout.completed_at && !(workout as typeof workout & { is_skipped?: boolean }).is_skipped)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 24)
    .map(workout => {
      const sets = data.sets.filter(set => set.workout_id === workout.id && set.completed);
      const changed = sets.filter(set => {
        const tw = number(set.target_weight), aw = number(set.actual_weight);
        const tr = number(set.target_reps), ar = number(set.actual_reps);
        return (tw > 0 && aw > 0 && Math.abs(tw - aw) > 0.001) || (tr > 0 && ar > 0 && tr !== ar);
      }).length;
      const pain = sets.filter(set => number(set.pain_score) > 0).length;
      return {
        id: workout.id,
        date: workout.date,
        name: workout.day_name,
        duration: number(workout.workout_duration_minutes),
        sets: sets.length,
        changed,
        pain,
        completion: number((workout as typeof workout & { completion_percent?: number | null }).completion_percent),
      };
    }), [data.workouts, data.sets]);

  if (!settings.enabled) return <MainLayout showBack backTo="/app/settings" hideNav><div className="mx-auto max-w-[680px] py-16 text-center"><h1 className="type-page-title">Advanced Mode is off</h1></div></MainLayout>;

  return <MainLayout showBack backTo="/app/lab" hideNav wide>
    <div className="mx-auto max-w-[900px] pb-12">
      <header className="mb-5"><div className="type-eyebrow">Advanced</div><h1 className="type-page-title mt-1">Flight Recorder</h1></header>

      {!!events.events.length && <section className="rounded-[20px] border border-border bg-card overflow-hidden mb-5">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3"><span className="text-sm font-semibold">Coach events</span><button onClick={() => navigate('/app/settings/mcp')} className="type-action">MCP</button></div>
        <div className="divide-y divide-border">{events.events.slice(0, 8).map(event => {
          const payload = event.payload || {};
          const review = Boolean(payload.review);
          return <div key={event.id} className="px-4 py-3 flex items-start gap-3"><div className="mt-0.5">{review ? <TriangleAlert className="h-4 w-4"/> : <CircleCheck className="h-4 w-4"/>}</div><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{event.event_type.replace(/_/g,' ')}</div><div className="type-caption mt-0.5">{event.event_date}{number(payload.completed_sets) ? ` · ${number(payload.completed_sets)} sets` : ''}{number(payload.duration_minutes) ? ` · ${number(payload.duration_minutes)} min` : ''}</div></div>{!event.consumed_at && <span className="rounded-lg bg-muted px-2 py-1 type-meta">new</span>}</div>;
        })}</div>
      </section>}

      <section className="rounded-[20px] border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3"><span className="text-sm font-semibold">Sessions</span><span className="type-caption">90D</span></div>
        <div className="divide-y divide-border">{sessions.map(session => <button key={session.id} onClick={() => navigate(`/app/dataroom/workout/${session.id}`)} className="w-full px-4 py-3 text-left grid grid-cols-[minmax(0,1fr)_auto] gap-4 hover:bg-muted/30"><div className="min-w-0"><div className="text-sm font-semibold truncate">{session.name}</div><div className="type-caption mt-1">{session.date} · {session.sets} sets{session.duration ? ` · ${session.duration} min` : ''}</div><div className="mt-2 flex flex-wrap gap-2">{session.changed > 0 && <span className="rounded-lg bg-muted px-2 py-1 type-meta">{session.changed} changed</span>}{session.pain > 0 && <span className="rounded-lg bg-muted px-2 py-1 type-meta">{session.pain} pain flags</span>}{session.completion > 0 && session.completion < 100 && <span className="rounded-lg bg-muted px-2 py-1 type-meta">{session.completion}%</span>}</div></div><ChevronRight className="h-4 w-4 text-muted-foreground mt-1"/></button>)}{!sessions.length && <div className="p-5 type-caption">No completed sessions.</div>}</div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => navigate('/app/lab')} className="min-h-12 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2"><Gauge className="h-4 w-4"/>Lab</button><button onClick={() => navigate('/app/dataroom/timeline')} className="min-h-12 rounded-xl border border-border text-sm font-semibold flex items-center justify-center gap-2"><History className="h-4 w-4"/>Timeline</button></div>
    </div>
  </MainLayout>;
}
