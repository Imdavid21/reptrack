import { ChevronRight } from 'lucide-react';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { MuscleVolumeTimeline } from '@/components/dataroom/DataroomCharts';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';
import { useNavigate } from 'react-router-dom';

function TrainingContent() {
  const navigate = useNavigate();
  const { days, dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const completed = data.workouts.filter(workout => Boolean(workout.completed_at) && !(workout as typeof workout & { is_skipped?: boolean }).is_skipped);
  const durations = completed.map(workout => Number(workout.workout_duration_minutes || 0)).filter(value => value > 0);
  const avgDuration = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;
  const muscles = (data.analysis?.muscles || []).filter(muscle => muscle.setsPerWeek > 0).sort((a, b) => b.setsPerWeek - a.setsPerWeek);
  const maxSets = Math.max(1, ...muscles.map(muscle => muscle.setsPerWeek));
  const painSets = data.sets.filter(set => Number(set.pain_score || 0) > 0);
  const romSets = data.sets.filter(set => set.rom_quality != null);
  const reducedSessions = completed.filter(workout => Boolean((workout as typeof workout & { readiness_band?: string | null }).readiness_band) && (workout as typeof workout & { readiness_band?: string | null }).readiness_band !== 'green');

  return <div className="space-y-8">
    <section className="grid grid-cols-2 md:grid-cols-4 gap-5 border-y border-border py-5">
      <div><div className="type-caption">Training</div><div className="mt-1 text-xl font-semibold tabular-nums">{completed.length} workouts</div><div className="type-caption mt-0.5">{(completed.length / days * 7).toFixed(1)} / week</div></div>
      <div><div className="type-caption">Working sets</div><div className="mt-1 text-xl font-semibold tabular-nums">{data.sets.length}</div></div>
      <div><div className="type-caption">Average session</div><div className="mt-1 text-xl font-semibold tabular-nums">{avgDuration == null ? 'Not enough data' : `${avgDuration} min`}</div></div>
      <div><div className="type-caption">Readiness-adjusted</div><div className="mt-1 text-xl font-semibold tabular-nums">{reducedSessions.length}</div><div className="type-caption mt-0.5">context, not failure</div></div>
    </section>

    <section><div className="mb-3"><h2 className="type-section-title">Weekly Muscle Volume</h2><p className="type-caption mt-1">Fractional muscle-region attribution by week for the selected period.</p></div><MuscleVolumeTimeline sets={data.sets} /></section>

    <section><div className="mb-3"><h2 className="type-section-title">Muscle Group Volume</h2><p className="type-caption mt-1">Fractional muscle-region attribution normalized to the selected period. Population bands are references, not your measured optimum.</p></div>{muscles.length ? <div className="space-y-3">{muscles.slice(0, 12).map(muscle => <div key={muscle.muscle} className="grid grid-cols-[96px_1fr_54px] gap-3 items-center"><span className="text-sm truncate">{muscle.muscle}</span><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground rounded-full" style={{ width: `${Math.max(4, muscle.setsPerWeek / maxSets * 100)}%` }} /></div><span className="text-sm font-semibold tabular-nums text-right">{muscle.setsPerWeek}/wk</span></div>)}</div> : <p className="border-y border-border py-5 type-caption">Complete resistance sessions to see distribution.</p>}</section>

    <section><div className="mb-3"><h2 className="type-section-title">Exercise Progress</h2></div><div className="divide-y divide-border border-y border-border">{(data.analysis?.exercises || []).slice(0, 16).map(exercise => { const last = exercise.exposures.at(-1); return <button key={exercise.exercise} onClick={() => navigate(`/app/dataroom/exercise/${encodeURIComponent(exercise.exercise)}`)} className="w-full py-3 flex items-center gap-3 text-left hover:bg-muted/20"><div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{exercise.exercise}</div><div className="type-caption mt-0.5">{last ? `${last.weight > 0 ? `${last.weight} kg × ` : ''}${last.reps}${last.rir != null ? ` · ${last.rir} RIR` : ''}` : 'No comparable exposure'} · {exercise.exposures.length} exposure{exercise.exposures.length === 1 ? '' : 's'}</div></div><span className="text-xs font-semibold capitalize">{exercise.state === 'unclear' ? 'Needs data' : exercise.state}</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>; })}{!data.analysis?.exercises.length && <div className="py-5 type-caption">Not enough comparable exercise history yet.</div>}</div></section>

    <section><div className="mb-3"><h2 className="type-section-title">Session Quality</h2></div><div className="divide-y divide-border border-y border-border"><div className="py-3 flex justify-between gap-3 text-sm"><span>Sets with pain recorded</span><span className="font-semibold tabular-nums">{painSets.length}</span></div><div className="py-3 flex justify-between gap-3 text-sm"><span>Sets with ROM quality recorded</span><span className="font-semibold tabular-nums">{romSets.length}</span></div><div className="py-3 flex justify-between gap-3 text-sm"><span>Post-workout check-ins</span><span className="font-semibold tabular-nums">{data.postWorkout.length}</span></div></div><p className="type-caption mt-2">These are context signals only. RepTrack does not convert them into an injury-probability score.</p></section>
  </div>;
}

export default function DataroomTraining() {
  return <DataroomPageShell eyebrow="Dataroom" title="Training" description="Consistency, resistance exposure, exercise progression, and the context behind changes."><TrainingContent /></DataroomPageShell>;
}
