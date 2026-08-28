import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { ActivityTimeline } from '@/components/dataroom/DataroomCharts';
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

  return <div className="space-y-8">
    <section><div className="mb-3"><h2 className="type-section-title">Weekly Activity</h2><p className="type-caption mt-1">Recorded minutes by activity type, grouped by week.</p></div><ActivityTimeline activities={data.activities} /></section>

    <section><div className="mb-3"><h2 className="type-section-title">Time by Activity Type</h2></div>{activityRows.length ? <div className="divide-y divide-border border-y border-border">{activityRows.map(([kind, row]) => <div key={kind} className="py-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold capitalize">{kind.replace(/_/g, ' ')}</div><div className="type-caption mt-0.5">{row.sessions} recorded session{row.sessions === 1 ? '' : 's'}</div></div><div className="text-sm font-semibold tabular-nums">{Math.round(row.minutes)} min</div></div>)}</div> : <div className="border-y border-border py-5 type-caption">No manual activities in this range.</div>}</section>

    <section><div className="mb-3"><h2 className="type-section-title">Mobility Assessments</h2><p className="type-caption mt-1">Assessments are compared only when they were actually recorded. RepTrack does not interpolate between tests.</p></div>{latestMobility ? <div className="divide-y divide-border border-y border-border">
      {[
        ['Knee-to-wall · left', latestMobility.knee_to_wall_left_cm, firstMobility?.knee_to_wall_left_cm, 'cm'],
        ['Knee-to-wall · right', latestMobility.knee_to_wall_right_cm, firstMobility?.knee_to_wall_right_cm, 'cm'],
        ['Hip 90/90 · left', latestMobility.hip_90_90_left, firstMobility?.hip_90_90_left, ''],
        ['Hip 90/90 · right', latestMobility.hip_90_90_right, firstMobility?.hip_90_90_right, ''],
      ].map(([label, latest, first, unit]) => { const change = movementDelta(latest as number | null, first as number | null); return <div key={String(label)} className="py-3 flex items-center justify-between gap-3"><div className="text-sm font-semibold">{label}</div><div className="text-right"><div className="text-sm font-semibold tabular-nums">{latest == null ? 'Not recorded' : `${latest}${unit ? ` ${unit}` : ''}`}</div>{change != null && <div className="type-caption tabular-nums">{change > 0 ? '+' : ''}{change}{unit ? ` ${unit}` : ''}</div>}</div></div>; })}
      <div className="py-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Deep squat</div><div className="type-caption mt-0.5">{latestMobility.heels_down == null ? 'Heel position not recorded' : latestMobility.heels_down ? 'Heels down' : 'Heels not down'}</div></div><div className="text-sm font-semibold capitalize">{latestMobility.deep_squat_depth || 'Not recorded'}</div></div>
      {latestMobility.discomfort && <div className="py-3"><div className="text-sm font-semibold">Recorded discomfort</div><p className="type-caption mt-1">{latestMobility.discomfort}</p></div>}
    </div> : <div className="border-y border-border py-5 type-caption">No mobility assessments in this range.</div>}</section>
  </div>;
}

export default function DataroomActivity() {
  return <DataroomPageShell eyebrow="Dataroom" title="Activity & Movement" description="Recorded walking, running, cycling, and structured mobility assessments without an arbitrary activity score."><ActivityContent /></DataroomPageShell>;
}
