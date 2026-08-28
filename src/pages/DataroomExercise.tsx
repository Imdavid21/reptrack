import { useParams } from 'react-router-dom';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import { resolveCanonicalName } from '@/lib/exerciseMatching';

function ExerciseContent({ exerciseName }: { exerciseName: string }) {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const records = usePersonalRecords();
  const trend = data.analysis?.exercises.find(row => resolveCanonicalName(row.exercise) === resolveCanonicalName(exerciseName));
  const exactRecord = records.getPRForExercise(exerciseName);
  const familyRecord = records.getFamilyPRForExercise(exerciseName);

  return <div className="space-y-8">
    <section className="grid grid-cols-2 md:grid-cols-4 gap-5 border-y border-border py-5">
      <div><div className="type-caption">Status</div><div className="mt-1 text-xl font-semibold capitalize">{trend?.state === 'unclear' || !trend ? 'Needs data' : trend.state}</div></div>
      <div><div className="type-caption">Comparable exposures</div><div className="mt-1 text-xl font-semibold tabular-nums">{trend?.exposures.length ?? 0}</div></div>
      <div><div className="type-caption">Progression signal</div><div className="mt-1 text-xl font-semibold capitalize">{trend?.progressionType?.replace('-', ' ') || 'Unclear'}</div></div>
      <div><div className="type-caption">Exact PR</div><div className="mt-1 text-xl font-semibold tabular-nums">{exactRecord ? exactRecord.prType === 'weight' ? `${exactRecord.maxWeight} kg` : exactRecord.reps : 'None yet'}</div></div>
    </section>

    <section><div className="mb-3"><div className="type-eyebrow">History</div><h2 className="type-section-title mt-1">Recent Sets</h2></div>{trend?.exposures.length ? <div className="divide-y divide-border border-y border-border">{[...trend.exposures].reverse().map(exposure => <div key={`${exposure.date}-${exposure.weight}-${exposure.reps}`} className="py-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold tabular-nums">{exposure.date}</div><div className="type-caption mt-0.5">{exposure.rir == null ? 'RIR not recorded' : `${exposure.rir} RIR`}</div></div><div className="text-sm font-semibold tabular-nums">{exposure.weight > 0 ? `${exposure.weight} kg × ${exposure.reps}` : `${exposure.reps} reps`}</div></div>)}</div> : <div className="border-y border-border py-6 type-caption">Not enough comparable exposures in this range.</div>}</section>

    <section><div className="mb-3"><div className="type-eyebrow">Records</div><h2 className="type-section-title mt-1">Personal Records</h2></div><div className="divide-y divide-border border-y border-border"><div className="py-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Exact exercise record</div><div className="type-caption mt-0.5">Only true identity aliases share this record.</div></div><div className="text-sm font-semibold tabular-nums">{exactRecord ? exactRecord.prType === 'weight' ? `${exactRecord.maxWeight} kg × ${parseInt(exactRecord.reps) || exactRecord.reps}` : exactRecord.reps : '—'}</div></div>{familyRecord && <div className="py-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Comparable variation</div><div className="type-caption mt-0.5">{familyRecord.exerciseName} · {familyRecord.familyLabel}</div></div><div className="text-sm font-semibold tabular-nums">{familyRecord.maxWeight} kg × {parseInt(familyRecord.reps) || familyRecord.reps}</div></div>}</div><p className="type-caption mt-2">Machine/free-weight alternatives do not inherit raw PR numbers merely because they train the same muscle.</p></section>
  </div>;
}

export default function DataroomExercise() {
  const { exercise = '' } = useParams();
  const name = decodeURIComponent(exercise);
  return <DataroomPageShell eyebrow="Dataroom · Exercise" title={name || 'Exercise'} description="Movement-specific progression using exercise-appropriate and PR-safe comparisons."><ExerciseContent exerciseName={name} /></DataroomPageShell>;
}
