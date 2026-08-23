import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Activity, ChevronRight, Dumbbell, Moon, Scale, Utensils } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProgressOverview, type ProgressRangeDays } from '@/hooks/useProgressOverview';
import { useUserPreferences } from '@/hooks/useUserPreferences';

const RANGE_OPTIONS: Array<{ label: string; days: ProgressRangeDays }> = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
];

function formatWeight(value: number | null) {
  if (value == null) return '—';
  return `${Number(value.toFixed(2)).toString()} kg`;
}

function trendSentence(rate: number | null, workoutCount: number, averageProtein: number | null) {
  const facts: string[] = [];
  if (rate != null) {
    if (Math.abs(rate) < 0.1) facts.push('Bodyweight trend is broadly stable.');
    else facts.push(`Bodyweight trend is ${rate < 0 ? 'down' : 'up'} ${Math.abs(rate).toFixed(2)} kg/week.`);
  }
  if (workoutCount > 0) facts.push(`${workoutCount} completed workout${workoutCount === 1 ? '' : 's'} are in this range.`);
  if (averageProtein != null) facts.push(`Logged nutrition days average ${Math.round(averageProtein)} g protein.`);
  return facts[0] || 'Keep logging a few more days to establish a useful trend.';
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
      {action && onAction && <button onClick={onAction} className="min-h-11 px-2 text-sm text-muted-foreground hover:text-foreground">{action}</button>}
    </div>
  );
}

export default function Progress() {
  const navigate = useNavigate();
  const { preferences } = useUserPreferences();
  const [range, setRange] = useState<ProgressRangeDays>(() => {
    const stored = Number(window.localStorage.getItem('reptrack-progress-range'));
    return [7, 30, 90, 180, 365].includes(stored) ? stored as ProgressRangeDays : 30;
  });
  const { data, isLoading, isError, refetch } = useProgressOverview(range);

  const chartDomain = useMemo(() => {
    const values = data?.weightPoints.map(point => point.weight) || [];
    if (!values.length) return ['auto', 'auto'] as const;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(0.5, (max - min) * 0.35);
    return [Math.floor((min - pad) * 2) / 2, Math.ceil((max + pad) * 2) / 2] as const;
  }, [data?.weightPoints]);

  const setRangeAndRemember = (days: ProgressRangeDays) => {
    setRange(days);
    window.localStorage.setItem('reptrack-progress-range', String(days));
  };

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-[760px] space-y-8 pb-8">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="type-eyebrow">Progress</p>
            <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.03em]">Is the plan working?</h1>
          </div>
          <button onClick={() => navigate('/app/settings')} className="min-h-11 px-3 text-sm text-muted-foreground hover:text-foreground">Settings</button>
        </header>

        <div className="inline-flex rounded-xl bg-muted p-1" role="group" aria-label="Progress date range">
          {RANGE_OPTIONS.map(option => (
            <button
              key={option.days}
              onClick={() => setRangeAndRemember(option.days)}
              aria-pressed={range === option.days}
              className={`min-h-10 min-w-12 rounded-lg px-3 text-sm font-medium transition-colors ${range === option.days ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-4" aria-label="Loading progress">
            <div className="h-28 animate-pulse rounded-[20px] bg-muted" />
            <div className="h-48 animate-pulse rounded-[20px] bg-muted" />
          </div>
        )}

        {isError && (
          <section className="rounded-[20px] border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Couldn't load Progress.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your workout and daily logging remain available.</p>
            <button onClick={() => refetch()} className="mt-4 min-h-11 rounded-xl bg-foreground px-4 text-sm font-semibold text-background">Retry</button>
          </section>
        )}

        {data && (
          <>
            <section aria-labelledby="progress-status" className="space-y-4">
              <div>
                <p className="type-eyebrow">Last {range} days</p>
                <p id="progress-status" className="mt-2 max-w-[620px] text-[20px] font-medium leading-7 tracking-tight">
                  {trendSentence(data.ratePerWeek, data.workoutCount, data.averageProtein)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-5 gap-y-5 border-y border-border py-5 sm:grid-cols-4">
                <div><div className="type-caption">7-day weight</div><div className="mt-1 text-xl font-semibold tabular-nums">{formatWeight(data.average7d)}</div>{data.weightChange != null && <div className="mt-1 text-xs text-muted-foreground tabular-nums">{data.weightChange > 0 ? '+' : ''}{data.weightChange.toFixed(2)} kg in range</div>}</div>
                <div><div className="type-caption">Training</div><div className="mt-1 text-xl font-semibold tabular-nums">{data.workoutCount}</div><div className="mt-1 text-xs text-muted-foreground tabular-nums">{data.workoutsPerWeek}/week</div></div>
                <div><div className="type-caption">Protein</div><div className="mt-1 text-xl font-semibold tabular-nums">{data.averageProtein != null ? `${data.averageProtein} g` : '—'}</div><div className="mt-1 text-xs text-muted-foreground">logged-day average</div></div>
                <div><div className="type-caption">Sleep</div><div className="mt-1 text-xl font-semibold tabular-nums">{data.averageSleep != null ? `${data.averageSleep.toFixed(1)} h` : '—'}</div><div className="mt-1 text-xs text-muted-foreground">{data.sleepDays ? `${data.sleepDays} logged nights` : 'No logged nights'}</div></div>
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeader title="Bodyweight" />
              {data.weightPoints.length >= 2 ? (
                <div className="rounded-[20px] border border-border bg-card p-4">
                  <div className="grid grid-cols-3 gap-3 border-b border-border pb-4">
                    <div><div className="type-caption">Latest</div><div className="mt-1 font-semibold tabular-nums">{formatWeight(data.latestWeight)}</div></div>
                    <div><div className="type-caption">7-day average</div><div className="mt-1 font-semibold tabular-nums">{formatWeight(data.average7d)}</div></div>
                    <div><div className="type-caption">Current rate</div><div className="mt-1 font-semibold tabular-nums">{data.ratePerWeek == null ? 'Need more data' : `${data.ratePerWeek > 0 ? '+' : ''}${data.ratePerWeek.toFixed(2)} kg/wk`}</div></div>
                  </div>
                  <div className="mt-4 h-52" role="img" aria-label={`Bodyweight trend. Latest ${formatWeight(data.latestWeight)}. Seven day average ${formatWeight(data.average7d)}.`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.weightPoints} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={value => format(parseISO(value), 'MMM d')} minTickGap={24} />
                        <YAxis domain={chartDomain as [number, number]} tickFormatter={value => Number(value).toFixed(1)} width={52} />
                        <Tooltip
                          labelFormatter={value => format(parseISO(String(value)), 'MMM d')}
                          formatter={(value: number, name: string) => [`${Number(value).toFixed(2)} kg`, name === 'average7d' ? '7-day average' : 'Weight']}
                          contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12 }}
                        />
                        {preferences?.weight_goal ? <ReferenceLine y={preferences.weight_goal} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" /> : null}
                        <Line type="monotone" dataKey="weight" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.35} strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="average7d" stroke="hsl(var(--foreground))" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="rounded-[20px] border border-border bg-card p-5 text-sm text-muted-foreground">Log at least two weigh-ins to begin seeing a trend.</div>
              )}
            </section>

            <section className="space-y-3">
              <SectionHeader title="Training" action="Full history" onAction={() => navigate('/app/progress/history')} />
              <div className="rounded-[20px] border border-border bg-card overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                  <div className="p-4"><div className="type-caption">Workouts</div><div className="mt-1 text-xl font-semibold tabular-nums">{data.workoutCount}</div></div>
                  <div className="p-4"><div className="type-caption">Working sets</div><div className="mt-1 text-xl font-semibold tabular-nums">{data.workingSets}</div></div>
                  <div className="p-4"><div className="type-caption">Avg duration</div><div className="mt-1 text-xl font-semibold tabular-nums">{data.averageWorkoutMinutes != null ? `${data.averageWorkoutMinutes}m` : '—'}</div></div>
                </div>
                <div className="p-4">
                  <div className="type-caption mb-3">Most trained · set distribution, not a hypertrophy score</div>
                  {data.muscleSets.length ? <div className="space-y-3">
                    {data.muscleSets.slice(0, 8).map(item => {
                      const max = data.muscleSets[0]?.sets || 1;
                      return <div key={item.label} className="grid grid-cols-[88px_1fr_40px] items-center gap-3 text-sm"><span>{item.label}</span><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(4, item.sets / max * 100)}%` }} /></div><span className="text-right tabular-nums text-muted-foreground">{item.sets}</span></div>;
                    })}
                  </div> : <p className="text-sm text-muted-foreground">Complete a few workouts to see training distribution.</p>}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeader title="Nutrition and recovery" action="Deeper metrics" onAction={() => navigate('/app/progress/analytics')} />
              <div className="rounded-[20px] border border-border bg-card divide-y divide-border overflow-hidden">
                <div className="flex min-h-14 items-center gap-3 px-4 py-3"><Utensils className="h-4 w-4 text-muted-foreground"/><div className="flex-1"><div className="text-sm font-medium">Calories</div><div className="text-xs text-muted-foreground">Logged-day average · {data.nutritionDays} day{data.nutritionDays === 1 ? '' : 's'}</div></div><div className="font-semibold tabular-nums">{data.averageCalories != null ? `${data.averageCalories.toLocaleString()} kcal` : 'Not enough data'}</div></div>
                <div className="flex min-h-14 items-center gap-3 px-4 py-3"><Moon className="h-4 w-4 text-muted-foreground"/><div className="flex-1"><div className="text-sm font-medium">Sleep</div><div className="text-xs text-muted-foreground">Duration only</div></div><div className="font-semibold tabular-nums">{data.averageSleep != null ? `${data.averageSleep.toFixed(1)} h` : 'Not logged'}</div></div>
                <div className="px-4 py-3"><div className="flex items-center gap-3"><Activity className="h-4 w-4 text-muted-foreground"/><div className="flex-1 text-sm font-medium">Activity</div></div>{data.activity.length ? <div className="mt-3 space-y-2 pl-7">{data.activity.slice(0, 4).map(item => <div key={item.type} className="flex justify-between gap-4 text-sm"><span className="capitalize text-muted-foreground">{item.type}</span><span className="tabular-nums">{item.distanceKm > 0 ? `${item.distanceKm} km · ` : ''}${item.minutes} min</span></div>)}</div> : <p className="mt-2 pl-7 text-sm text-muted-foreground">No activity logged in this range.</p>}</div>
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeader title="Timeline" action="History" onAction={() => navigate('/app/progress/history')} />
              <div className="rounded-[20px] border border-border bg-card divide-y divide-border overflow-hidden">
                {data.timeline.length ? data.timeline.slice(0, 12).map(item => {
                  const Icon = item.kind === 'workout' ? Dumbbell : item.kind === 'weight' ? Scale : item.kind === 'sleep' ? Moon : Activity;
                  const clickable = Boolean(item.workoutId);
                  return <button key={item.id} disabled={!clickable} onClick={() => item.workoutId && navigate(`/app/progress/workout/${item.workoutId}`)} className="flex w-full min-h-16 items-center gap-3 px-4 py-3 text-left disabled:cursor-default"><Icon className="h-4 w-4 text-muted-foreground"/><div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{item.title}</div><div className="text-xs text-muted-foreground tabular-nums">{format(parseISO(item.date), 'MMM d')} · {item.detail}</div></div>{clickable && <ChevronRight className="h-4 w-4 text-muted-foreground"/>}</button>;
                }) : <p className="p-5 text-sm text-muted-foreground">Complete a workout or log a daily metric to build your timeline.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </MainLayout>
  );
}
