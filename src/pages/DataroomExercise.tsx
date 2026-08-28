import { useParams } from 'react-router-dom';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { ExerciseProgressChart } from '@/components/dataroom/DataroomCharts';
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
      <div><div className="type-caption">Exposures</div><div className="mt-1 text-xl font-semibold tabular-nums">{trend?.exposures.length ?? 0}</div></div>
      <div><div className="type-caption">Signal</div><div className="mt-1 text-xl font-semibold capitalize">{trend?.progressionType?.replace('-', ' ') || 'Unclear'}</div></div>
      <div><div className="type-caption">PR</div><div className="mt-1 text-xl font-semibold tabular-nums">{exactRecord ? exactRecord.prType === 'weight' ? `${exactRecord.maxWeight} kg` : exactRecord.reps : 'None'}</div></div>
    </section>

    <section><div className="mb-3"><h2 className="type-section-title">Progression</h2><p className="type-caption mt-1">e1RM when available.</p></div><ExerciseProgressChart exposures={trend?.exposures || []} /></section>

    <section><div className="mb-3"><h2 className="type-section-title">Recent Sets</h2></div>{trend?.exposures.length ? <div className="divide-y divide-border border-y border-border">{[...trend.exposures].reverse().map(exposure => <div key={`${exposure.date}-${exposure.weight}-${exposure.reps}`} className="py-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold tabular-nums">{exposure.date}</div>{exposure.rir != null && <div className="type-caption mt-0.5">{exposure.rir} RIR</div>}</div><div className="text-sm font-semibold tabular-nums">{exposure.weight > 0 ? `${exposure.weight} kg × ${exposure.reps}` : `${exposure.reps} reps`}</div></div>)}</div> : <div className="border-y border-border py-6 type-caption">Not enough comparable exposures.</div>}</section>

    <section><div className="mb-3"><h2 className="type-section-title">Personal Records</h2></div><div className="divide-y divide-border border-y border-border"><div className="py-3 flex items-center justify-between gap-3"><div className="text-sm font-semibold">Exact PR</div><div className="text-sm font-semibold tabular-nums">{exactRecord ? exactRecord.prType === 'weight' ? `${exactRecord.maxWeight} kg × ${parseInt(exactRecord.reps) || exactRecord.reps}` : exactRecord.reps : '—'}</div></div>{familyRecord && <div className="py-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Comparable variation</div><div className="type-caption mt-0.5">{familyRecord.exerciseName}</div></div><div className="text-sm font-semibold tabular-nums">{familyRecord.maxWeight} kg × {parseInt(familyRecord.reps) || familyRecord.reps}</div></div>}</div></section>
  </div>;
}

export default function DataroomExercise() {
  const { exercise = '' } = useParams();
  const name = decodeURIComponent(exercise);
  return <DataroomPageShell title={name || 'Exercise'}><ExerciseContent exerciseName={name} /></DataroomPageShell>;
}
