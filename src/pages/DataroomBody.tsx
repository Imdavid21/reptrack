import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { BodyMeasurementMap, TrendLineChart, VisualSection } from '@/components/dataroom/MobileDataVisuals';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

function Value({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div><div className="type-caption">{label}</div><div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>{detail && <div className="type-caption mt-0.5">{detail}</div>}</div>;
}

function BodyContent() {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const weight = data.analysis?.weight;
  const firstPhysique = data.physique.at(0);
  const latestPhysique = data.physique.at(-1);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null);
  const delta = (current: number | null, previous: number | null) => current != null && previous != null ? Number((current - previous).toFixed(1)) : null;

  const weightChart = useMemo(() => (weight?.points || []).map(point => ({ date: point.date, label: format(parseISO(point.date), 'd MMM'), trend: point.trend, raw: point.raw })), [weight?.points]);
  const measurementDefs = useMemo(() => [
    { key: 'chest', label: 'Chest', field: 'chest_cm' as const },
    { key: 'waist', label: 'Waist', field: 'waist_cm' as const },
    { key: 'leftArm', label: 'Left arm', field: 'upper_arm_left_cm' as const },
    { key: 'rightArm', label: 'Right arm', field: 'upper_arm_right_cm' as const },
    { key: 'leftCalf', label: 'Left calf', field: 'calf_left_cm' as const },
    { key: 'rightCalf', label: 'Right calf', field: 'calf_right_cm' as const },
  ], []);
  const measurements = measurementDefs.map(def => ({ key: def.key, label: def.label, value: latestPhysique?.[def.field] ?? null, delta: delta(latestPhysique?.[def.field] ?? null, firstPhysique?.[def.field] ?? null) }));
  const selectedDef = measurementDefs.find(item => item.key === selectedMeasurement);
  const selectedHistory = selectedDef ? data.physique.filter(row => row[selectedDef.field] != null).map(row => ({ date: row.checkin_date, label: format(parseISO(row.checkin_date), 'd MMM'), value: row[selectedDef.field] })) : [];

  return <div className="space-y-9">
    <section className="grid grid-cols-2 gap-4 border-y border-border py-4">
      <Value label="Trend" value={weight?.trendWeight == null ? 'Not enough data' : `${weight.trendWeight.toFixed(1)} kg`} />
      <Value label="Latest" value={weight?.latest == null ? 'Not logged' : `${weight.latest.toFixed(1)} kg`} />
      <Value label="Recent change" value={weight?.change == null ? 'Need more data' : `${weight.change > 0 ? '+' : ''}${weight.change.toFixed(2)} kg`} detail={`${weight?.observations || 0} measurements`} />
      <Value label="Rate" value={weight?.percentPerWeek == null ? 'Need more data' : `${weight.percentPerWeek > 0 ? '+' : ''}${weight.percentPerWeek.toFixed(2)}% / week`} detail="Scale trend" />
    </section>

    <VisualSection title="Bodyweight trajectory" description="Recorded weigh-ins stay visible as observations. The stronger line is the smoothed trend.">
      <TrendLineChart data={weightChart} lines={[{ key: 'trend', label: 'Trend', suffix: ' kg' }, { key: 'raw', label: 'Scale', suffix: ' kg', dashed: true }]} reference={data.preferences?.weight_goal ? { value: Number(data.preferences.weight_goal), label: 'Current goal' } : undefined} summary="Bodyweight trend and recorded scale measurements. Missing weigh-ins are not interpolated as observations." />
    </VisualSection>

    <VisualSection title="Recorded measurements" description="Tap a measurement to inspect its check-in history.">
      {latestPhysique ? <BodyMeasurementMap measurements={measurements} onSelect={setSelectedMeasurement} /> : <div className="border-y border-border py-8 px-4 text-center"><p className="text-sm font-semibold">No physique check-ins in this range.</p><p className="type-caption mt-1">Bodyweight can still be interpreted independently. Measurements are never inferred between check-ins.</p></div>}
      {latestPhysique?.body_fat_percentage != null && <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3"><div><div className="text-sm font-semibold">Body-fat entry</div><div className="type-caption mt-0.5">User-recorded. RepTrack does not interpolate it.</div></div><div className="text-lg font-semibold tabular-nums">{latestPhysique.body_fat_percentage}%</div></div>}
    </VisualSection>

    {data.physique.length > 1 && <VisualSection title="Measurement changes" description="Recorded change from the first to latest check-in inside this range.">
      <div className="grid grid-cols-2 gap-x-4">{measurements.map(item => <button key={item.key} onClick={() => setSelectedMeasurement(item.key)} className="min-h-20 border-t border-border py-3 text-left"><div className="type-meta">{item.label}</div><div className="mt-1 text-lg font-semibold tabular-nums">{item.value == null ? '—' : `${item.value} cm`}</div>{item.delta != null && <div className="type-caption tabular-nums">{item.delta > 0 ? '+' : ''}{item.delta} cm in range</div>}</button>)}</div>
    </VisualSection>}

    <Drawer open={!!selectedMeasurement} onOpenChange={open => !open && setSelectedMeasurement(null)}>
      <DrawerContent className="rounded-t-[28px]"><DrawerHeader className="px-5 text-left"><DrawerTitle>{selectedDef?.label || 'Measurement'}</DrawerTitle></DrawerHeader><div className="px-5 pb-[max(24px,env(safe-area-inset-bottom))]">{selectedHistory.length > 1 ? <TrendLineChart data={selectedHistory} lines={[{ key: 'value', label: selectedDef?.label || 'Measurement', suffix: ' cm' }]} height={190} summary={`${selectedDef?.label || 'Measurement'} across recorded physique check-ins.`} /> : <div className="border-y border-border py-6 px-4 type-caption">At least two recorded check-ins are needed for a trend.</div>}</div></DrawerContent>
    </Drawer>
  </div>;
}

export default function DataroomBody() {
  return <DataroomPageShell eyebrow="Dataroom" title="Body & physique" description="Scale trend first, recorded measurements second. No inferred body-fat or muscle change."><BodyContent /></DataroomPageShell>;
}
