import { DataroomPageShell } from '@/components/dataroom/DataroomPageShell';
import { ActivityTimeline } from '@/components/dataroom/DataroomCharts';
import { useDataroomRange } from '@/contexts/DataroomRangeContext';
import { useDataroomData } from '@/hooks/useDataroomData';

function MobilityBalance({ left, right, label, unit = '' }: { left: number | null; right: number | null; label: string; unit?: string }) {
  if (left == null || right == null) return null;
  const low = Math.min(left, right);
  const high = Math.max(left, right);
  const span = Math.max(1, high - low);
  const min = low - span * 0.35;
  const max = high + span * 0.35;
  const x = (value: number) => 14 + (value - min) / Math.max(0.01, max - min) * 72;
  return <div className="rounded-xl border border-border bg-card p-3">
    <div className="flex items-baseline justify-between gap-3"><div className="text-sm font-semibold">{label}</div><div className="type-caption tabular-nums">Δ {Math.abs(left - right).toFixed(1)}{unit ? ` ${unit}` : ''}</div></div>
    <svg viewBox="0 0 100 24" className="mt-2 h-8 w-full" role="img" aria-label={`${label}: left ${left}${unit}, right ${right}${unit}`}>
      <line x1={x(left)} y1="12" x2={x(right)} y2="12" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <circle cx={x(left)} cy="12" r="4" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="2" />
      <circle cx={x(right)} cy="12" r="4" fill="currentColor" />
    </svg>
    <div className="flex justify-between type-caption tabular-nums"><span>L {left}{unit ? ` ${unit}` : ''}</span><span>R {right}{unit ? ` ${unit}` : ''}</span></div>
  </div>;
}

function StatTile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return <div className="rounded-xl border border-border bg-card p-3">
    <div className="type-caption">{label}</div>
    <div className="mt-1 flex items-baseline gap-1"><span className="text-2xl font-semibold tabular-nums leading-none">{value}</span>{unit && <span className="type-caption">{unit}</span>}</div>
    {sub && <div className="type-caption mt-1">{sub}</div>}
  </div>;
}

function ActivityContent() {
  const { dateRange } = useDataroomRange();
  const data = useDataroomData(dateRange);
  const grouped = new Map<string, { minutes: number; sessions: number; km: number }>();
  data.activities.forEach(activity => {
    const key = activity.activity_type || 'Activity';
    const row = grouped.get(key) || { minutes: 0, sessions: 0, km: 0 };
    row.minutes += Number(activity.duration_minutes || 0);
    row.km += Number(activity.distance_km || 0);
    row.sessions += 1;
    grouped.set(key, row);
  });
  const activityRows = [...grouped.entries()].sort((a, b) => b[1].minutes - a[1].minutes);
  const totalMinutes = activityRows.reduce((sum, [, row]) => sum + row.minutes, 0);
  const totalKm = activityRows.reduce((sum, [, row]) => sum + row.km, 0);
  const totalSessions = activityRows.reduce((sum, [, row]) => sum + row.sessions, 0);
  const activeDays = new Set(data.activities.map(activity => activity.date)).size;
  const maxMinutes = Math.max(1, ...activityRows.map(([, row]) => row.minutes));
  const firstMobility = data.mobility.at(0);
  const latestMobility = data.mobility.at(-1);
  const movementDelta = (latest: number | null, first: number | null) => latest != null && first != null && data.mobility.length > 1 ? Number((latest - first).toFixed(1)) : null;

  return <div className="space-y-8">
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatTile label="Moving time" value={String(Math.round(totalMinutes))} unit="min" sub={`${totalSessions} session${totalSessions === 1 ? '' : 's'}`} />
      <StatTile label="Distance" value={totalKm ? totalKm.toFixed(1) : '0'} unit="km" sub={totalKm && totalMinutes ? `${(totalMinutes / totalKm).toFixed(1)} min/km avg` : 'No distance logged'} />
      <StatTile label="Active days" value={String(activeDays)} sub={`${data.rangeDays} days in range`} />
      <StatTile label="Avg session" value={totalSessions ? String(Math.round(totalMinutes / totalSessions)) : '0'} unit="min" sub={activityRows.length ? `${activityRows.length} activity type${activityRows.length === 1 ? '' : 's'}` : 'No activities'} />
    </section>

    <section><div className="mb-3"><h2 className="type-section-title">Weekly Activity</h2></div><ActivityTimeline activities={data.activities} /></section>


    <section><div className="mb-3"><h2 className="type-section-title">Activity Totals</h2></div>{activityRows.length ? <div className="space-y-2">{activityRows.map(([kind, row]) => <div key={kind} className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-3"><div className="text-sm font-semibold capitalize">{kind.replace(/_/g, ' ')}</div><div className="text-sm font-semibold tabular-nums">{Math.round(row.minutes)} min</div></div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-energy" style={{ width: `${Math.max(4, (row.minutes / maxMinutes) * 100)}%` }} /></div>
      <div className="type-caption mt-2 tabular-nums">{row.sessions} session{row.sessions === 1 ? '' : 's'}{row.km ? ` · ${row.km.toFixed(1)} km · ${(row.minutes / row.km).toFixed(1)} min/km` : ''}</div>
    </div>)}</div> : <div className="border-y border-border py-5 type-caption">No activities in this range.</div>}</section>


    {latestMobility && <section><div className="mb-3"><h2 className="type-section-title">Left vs Right</h2><p className="type-caption mt-1">Hollow = left · filled = right</p></div><div className="grid gap-3 md:grid-cols-2"><MobilityBalance label="Knee-to-wall" left={latestMobility.knee_to_wall_left_cm} right={latestMobility.knee_to_wall_right_cm} unit="cm"/><MobilityBalance label="Hip 90/90" left={latestMobility.hip_90_90_left} right={latestMobility.hip_90_90_right}/></div></section>}

    <section><div className="mb-3"><h2 className="type-section-title">Mobility Assessments</h2></div>{latestMobility ? <div className="divide-y divide-border border-y border-border">
      {[
        ['Knee-to-wall · left', latestMobility.knee_to_wall_left_cm, firstMobility?.knee_to_wall_left_cm, 'cm'],
        ['Knee-to-wall · right', latestMobility.knee_to_wall_right_cm, firstMobility?.knee_to_wall_right_cm, 'cm'],
        ['Hip 90/90 · left', latestMobility.hip_90_90_left, firstMobility?.hip_90_90_left, ''],
        ['Hip 90/90 · right', latestMobility.hip_90_90_right, firstMobility?.hip_90_90_right, ''],
      ].map(([label, latest, first, unit]) => { const change = movementDelta(latest as number | null, first as number | null); return <div key={String(label)} className="py-3 flex items-center justify-between gap-3"><div className="text-sm font-semibold">{label}</div><div className="text-right"><div className="text-sm font-semibold tabular-nums">{latest == null ? 'Not recorded' : `${latest}${unit ? ` ${unit}` : ''}`}</div>{change != null && <div className="type-caption tabular-nums">{change > 0 ? '+' : ''}{change}{unit ? ` ${unit}` : ''}</div>}</div></div>; })}
      <div className="py-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Deep squat</div><div className="type-caption mt-0.5">{latestMobility.heels_down == null ? 'Heel position not recorded' : latestMobility.heels_down ? 'Heels down' : 'Heels not down'}</div></div><div className="text-sm font-semibold capitalize">{latestMobility.deep_squat_depth || 'Not recorded'}</div></div>
      {latestMobility.discomfort && <div className="py-3"><div className="text-sm font-semibold">Discomfort</div><p className="type-caption mt-1">{latestMobility.discomfort}</p></div>}
    </div> : <div className="border-y border-border py-5 type-caption">No mobility assessments in this range.</div>}</section>
  </div>;
}

export default function DataroomActivity() {
  return <DataroomPageShell title="Activity & Movement"><ActivityContent /></DataroomPageShell>;
}
