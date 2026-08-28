import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { WeightTrendChart } from '@/components/progress/WeightTrendChart';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

function Value({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div><div className="type-caption">{label}</div><div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>{detail && <div className="type-caption mt-0.5">{detail}</div>}</div>;
}

function BodyContent() {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const weight = data.analysis?.weight;
  const firstPhysique = data.physique.at(0);
  const latestPhysique = data.physique.at(-1);
  const delta = (current: number | null, previous: number | null) => current != null && previous != null ? Number((current - previous).toFixed(1)) : null;

  return <div className="space-y-8">
    <section className="grid grid-cols-2 md:grid-cols-4 gap-5 border-y border-border py-5">
      <Value label="Trend" value={weight?.trendWeight == null ? 'Not enough data' : `${weight.trendWeight.toFixed(1)} kg`} />
      <Value label="Latest" value={weight?.latest == null ? 'Not logged' : `${weight.latest.toFixed(1)} kg`} />
      <Value label="Recent change" value={weight?.change == null ? 'Need more data' : `${weight.change > 0 ? '+' : ''}${weight.change.toFixed(2)} kg`} detail={`${weight?.observations || 0} measurements`} />
      <Value label="Rate" value={weight?.percentPerWeek == null ? 'Need more data' : `${weight.percentPerWeek > 0 ? '+' : ''}${weight.percentPerWeek.toFixed(2)}% / week`} detail="Scale trend, not body-fat change" />
    </section>

    <section><div className="mb-3"><div className="type-eyebrow">Bodyweight</div><h2 className="type-section-title mt-1">Bodyweight Trend</h2></div><WeightTrendChart metrics={data.metrics} target={data.preferences?.weight_goal} /></section>

    <section><div className="mb-3"><div className="type-eyebrow">Physique</div><h2 className="type-section-title mt-1">Physique Check-Ins</h2></div>{latestPhysique ? <div className="border-y border-border divide-y divide-border">
      {[
        ['Waist', latestPhysique.waist_cm, firstPhysique?.waist_cm, 'cm'],
        ['Chest', latestPhysique.chest_cm, firstPhysique?.chest_cm, 'cm'],
        ['Left upper arm', latestPhysique.upper_arm_left_cm, firstPhysique?.upper_arm_left_cm, 'cm'],
        ['Right upper arm', latestPhysique.upper_arm_right_cm, firstPhysique?.upper_arm_right_cm, 'cm'],
        ['Left calf', latestPhysique.calf_left_cm, firstPhysique?.calf_left_cm, 'cm'],
        ['Right calf', latestPhysique.calf_right_cm, firstPhysique?.calf_right_cm, 'cm'],
      ].map(([label, current, previous, unit]) => {
        const change = delta(current as number | null, previous as number | null);
        return <div key={label as string} className="py-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">{label}</div><div className="type-caption mt-0.5">Latest recorded measurement</div></div><div className="text-right"><div className="text-sm font-semibold tabular-nums">{current == null ? 'Not measured' : `${current} ${unit}`}</div>{change != null && data.physique.length > 1 && <div className="type-caption tabular-nums">{change > 0 ? '+' : ''}{change} {unit} in selected range</div>}</div></div>;
      })}
      {latestPhysique.body_fat_percentage != null && <div className="py-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Body-fat entry</div><div className="type-caption mt-0.5">User-recorded measurement; RepTrack does not interpolate it</div></div><div className="text-sm font-semibold tabular-nums">{latestPhysique.body_fat_percentage}%</div></div>}
    </div> : <div className="border-y border-border py-6"><p className="text-sm font-semibold">No physique check-ins in this range.</p><p className="type-caption mt-1">Bodyweight can still be interpreted independently. Measurements are not inferred between check-ins.</p></div>}</section>
  </div>;
}

export default function DataroomBody() {
  return <DataroomPageShell eyebrow="Dataroom" title="Body & Physique" description="Scale trend first, slower physique measurements second. No inferred body-fat or muscle change."><BodyContent /></DataroomPageShell>;
}
