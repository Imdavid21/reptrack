import { useMemo } from 'react';
import { eachDayOfInterval, format } from 'date-fns';
import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { ActivityBars, EvidenceMatrix, SymmetryGauge, VisualSection } from '@/components/dataroom/MobileDataVisuals';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

function ActivityContent() {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const grouped = new Map<string, { minutes: number; sessions: number }>();
  data.activities.forEach(activity => {
    const key = activity.activity_type || 'Activity';
    const row = grouped.get(key) || { minutes: 0, sessions: 0 };
    row.minutes += Number(activity.duration_minutes || 0);
    row.sessions += 1;
    grouped.set(key, row);
  });
  const activityRows = [...grouped.entries()].sort((a, b) => b[1].minutes - a[1].minutes);
  const firstMobility = data.mobility.at(0);
  const latestMobility = data.mobility.at(-1);
  const movementDelta = (latest: number | null, first: number | null) => latest != null && first != null && data.mobility.length > 1 ? Number((latest - first).toFixed(1)) : null;
  const dates = useMemo(() => eachDayOfInterval(dateRange).map(day => format(day, 'yyyy-MM-dd')), [dateRange]);
  const activityDates = useMemo(() => new Set(data.activities.map(item => item.date)), [data.activities]);

  return <div className="space-y-9">
    <VisualSection eyebrow="Recorded activity" title="Time by activity type" description="Common-scale bars make it easy to compare where recorded movement time went.">
      {activityRows.length ? <div className="rounded-2xl border border-border bg-card p-4"><ActivityBars rows={activityRows.map(([kind, row]) => ({ label: kind.replace(/_/g, ' '), value: row.minutes, detail: `${row.sessions} recorded session${row.sessions === 1 ? '' : 's'}` }))} /></div> : <div className="rounded-2xl border border-border bg-card py-8 text-center type-caption">No manual activities in this range.</div>}
    </VisualSection>

    <VisualSection eyebrow="Consistency" title="When movement was recorded" description="Filled cells mean at least one manual activity exists on that date.">
      <EvidenceMatrix dates={dates} rows={[{ label: 'Activity', observed: activityDates }]} />
    </VisualSection>

    <VisualSection eyebrow="Mobility" title="Left-right symmetry" description="Bilateral tests stay on a common horizontal scale. RepTrack only compares assessments that were actually recorded.">
      {latestMobility ? <div className="space-y-3">
        <SymmetryGauge label="Knee-to-wall" left={latestMobility.knee_to_wall_left_cm} right={latestMobility.knee_to_wall_right_cm} unit=" cm" />
        <SymmetryGauge label="Hip 90/90" left={latestMobility.hip_90_90_left} right={latestMobility.hip_90_90_right} />
      </div> : <div className="rounded-2xl border border-border bg-card py-8 text-center type-caption">No mobility assessments in this range.</div>}
    </VisualSection>

    {latestMobility && <VisualSection eyebrow="Latest assessment" title="Movement context">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3"><div className="type-meta">Deep squat</div><div className="mt-1 text-lg font-semibold capitalize">{latestMobility.deep_squat_depth || 'Not recorded'}</div></div>
        <div className="rounded-2xl border border-border bg-card p-3"><div className="type-meta">Heel position</div><div className="mt-1 text-lg font-semibold">{latestMobility.heels_down == null ? 'Not recorded' : latestMobility.heels_down ? 'Heels down' : 'Heels not down'}</div></div>
        {[
          ['Knee-to-wall · left', latestMobility.knee_to_wall_left_cm, firstMobility?.knee_to_wall_left_cm, 'cm'],
          ['Knee-to-wall · right', latestMobility.knee_to_wall_right_cm, firstMobility?.knee_to_wall_right_cm, 'cm'],
          ['Hip 90/90 · left', latestMobility.hip_90_90_left, firstMobility?.hip_90_90_left, ''],
          ['Hip 90/90 · right', latestMobility.hip_90_90_right, firstMobility?.hip_90_90_right, ''],
        ].map(([label, latest, first, unit]) => {
          const change = movementDelta(latest as number | null, first as number | null);
          return <div key={String(label)} className="rounded-2xl border border-border bg-card p-3"><div className="type-meta">{label}</div><div className="mt-1 text-lg font-semibold tabular-nums">{latest == null ? '—' : `${latest}${unit ? ` ${unit}` : ''}`}</div>{change != null && <div className="type-caption tabular-nums">{change > 0 ? '+' : ''}{change}{unit ? ` ${unit}` : ''} in range</div>}</div>;
        })}
        {latestMobility.discomfort && <div className="col-span-2 rounded-2xl border border-border bg-card p-3"><div className="type-meta">Recorded discomfort</div><p className="type-caption mt-1">{latestMobility.discomfort}</p></div>}
      </div>
    </VisualSection>}
  </div>;
}

export default function DataroomActivity() {
  return <DataroomPageShell eyebrow="Dataroom" title="Activity & movement" description="Recorded walking, running, cycling, and mobility assessments without an arbitrary activity score."><ActivityContent /></DataroomPageShell>;
}
