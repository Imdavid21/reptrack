import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { BulletRows, EvidenceMatrix, MiniSparkline, MuscleMap, VisualSection } from '@/components/dataroom/MobileDataVisuals';
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
  const painSets = data.sets.filter(set => Number(set.pain_score || 0) > 0);
  const romSets = data.sets.filter(set => set.rom_quality != null);
  const reducedSessions = completed.filter(workout => Boolean((workout as typeof workout & { readiness_band?: string | null }).readiness_band) && (workout as typeof workout & { readiness_band?: string | null }).readiness_band !== 'green');
  const dates = useMemo(() => eachDayOfInterval(dateRange).map(day => format(day, 'yyyy-MM-dd')), [dateRange]);
  const workoutDates = useMemo(() => new Set(completed.map(workout => workout.date)), [completed]);

  return <div className="space-y-9">
    <section className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-4">
      <div><div className="type-caption">Training</div><div className="mt-1 text-xl font-semibold tabular-nums">{completed.length} workouts</div><div className="type-caption mt-0.5">{(completed.length / days * 7).toFixed(1)} / week</div></div>
      <div><div className="type-caption">Working sets</div><div className="mt-1 text-xl font-semibold tabular-nums">{data.sets.length}</div></div>
      <div><div className="type-caption">Average session</div><div className="mt-1 text-xl font-semibold tabular-nums">{avgDuration == null ? 'Need data' : `${avgDuration} min`}</div></div>
      <div><div className="type-caption">Readiness-adjusted</div><div className="mt-1 text-xl font-semibold tabular-nums">{reducedSessions.length}</div><div className="type-caption mt-0.5">context, not failure</div></div>
    </section>

    <VisualSection eyebrow="Consistency" title="When you trained" description="Filled cells are completed resistance sessions. This is frequency evidence, not a quality score.">
      <EvidenceMatrix dates={dates} rows={[{ label: 'Workout', observed: workoutDates }]} onSelect={date => {
        const workout = completed.find(item => item.date === date);
        if (workout) navigate(`/app/dataroom/workout/${workout.id}`);
      }} />
    </VisualSection>

    <VisualSection eyebrow="Muscle exposure" title="Where your resistance work is going" description="Spatial view for scanning. Tap a region label for detail; exact comparisons remain on a common scale below.">
      {muscles.length ? <MuscleMap muscles={muscles} /> : <div className="rounded-2xl border border-border bg-card py-8 text-center type-caption">Complete resistance sessions to build muscle-region exposure.</div>}
    </VisualSection>

    {muscles.length > 0 && <VisualSection eyebrow="Distribution" title="Exposure against reference bands" description="The shaded range is a population reference, not your measured optimum. Fractional attribution is normalized to the selected period.">
      <BulletRows rows={muscles.slice(0, 12).map(muscle => ({ label: muscle.muscle, value: muscle.setsPerWeek, low: muscle.reference.low, high: muscle.reference.high, detail: muscle.progression }))} />
    </VisualSection>}

    <VisualSection eyebrow="Exercises" title="Comparable progression" description="Scan recent movement trends, then open one exercise for the full performance chart.">
      <div className="space-y-2">{(data.analysis?.exercises || []).slice(0, 10).map(exercise => {
        const last = exercise.exposures.at(-1);
        return <button key={exercise.exercise} onClick={() => navigate(`/app/dataroom/exercise/${encodeURIComponent(exercise.exercise)}`)} className="w-full rounded-2xl border border-border bg-card p-3 text-left active:scale-[.99] transition-transform">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate">{exercise.exercise}</div><div className="type-caption mt-0.5">{last ? `${last.weight > 0 ? `${last.weight} kg × ` : ''}${last.reps}${last.rir != null ? ` · ${last.rir} RIR` : ''}` : 'No comparable exposure'} · {exercise.exposures.length} exposure{exercise.exposures.length === 1 ? '' : 's'}</div></div>
            <div className="w-20 shrink-0 text-foreground/80"><MiniSparkline values={exercise.exposures.map(item => item.e1rm)} /></div>
            <div className="text-xs font-semibold capitalize">{exercise.state === 'unclear' ? 'Needs data' : exercise.state}</div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </button>;
      })}{!data.analysis?.exercises.length && <div className="rounded-2xl border border-border bg-card py-8 text-center type-caption">Not enough comparable exercise history yet.</div>}</div>
    </VisualSection>

    <VisualSection eyebrow="Context" title="Quality and discomfort signals" description="These remain context signals. RepTrack does not convert them into injury probability.">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3"><div className="type-meta">Pain</div><div className="mt-1 text-xl font-semibold tabular-nums">{painSets.length}</div><div className="type-caption">sets</div></div>
        <div className="rounded-2xl border border-border bg-card p-3"><div className="type-meta">ROM</div><div className="mt-1 text-xl font-semibold tabular-nums">{romSets.length}</div><div className="type-caption">recorded</div></div>
        <div className="rounded-2xl border border-border bg-card p-3"><div className="type-meta">Post</div><div className="mt-1 text-xl font-semibold tabular-nums">{data.postWorkout.length}</div><div className="type-caption">check-ins</div></div>
      </div>
    </VisualSection>
  </div>;
}

export default function DataroomTraining() {
  return <DataroomPageShell eyebrow="Dataroom" title="Training" description="Consistency, muscle exposure, exercise progression, and the context behind changes."><TrainingContent /></DataroomPageShell>;
}
