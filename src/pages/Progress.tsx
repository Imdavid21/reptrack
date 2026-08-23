import { useMemo, useState } from 'react';
import { Box, Skeleton } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { ChevronRight, Dumbbell, Scale, Moon, Utensils, Activity, BarChart3, History as HistoryIcon, Settings2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { WeightTrendChart } from '@/components/progress/WeightTrendChart';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useCalorieHistory } from '@/hooks/useCalorieHistory';
import { useManualActivitiesInRange } from '@/hooks/useCalorieBurn';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getBodyPart } from '@/lib/exerciseClassification';
import { PROGRESS_RANGE_DAYS, progressInterpretation, summarizeSleep, summarizeWeight, type ProgressRangeKey } from '@/lib/progressSummary';

const RANGE_KEY = 'reptrack-progress-range';
const RANGE_OPTIONS: ProgressRangeKey[] = ['7D', '30D', '3M', '6M', '1Y'];

function readRange(): ProgressRangeKey {
  if (typeof window === 'undefined') return '30D';
  const value = window.localStorage.getItem(RANGE_KEY) as ProgressRangeKey | null;
  return value && RANGE_OPTIONS.includes(value) ? value : '30D';
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0"><div className="type-caption">{label}</div><div className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</div>{detail && <div className="mt-0.5 type-caption">{detail}</div>}</div>;
}

function SectionLink({ icon: Icon, title, description, onClick }: { icon: typeof Scale; title: string; description: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/35 focus-visible:bg-muted/35 transition-colors"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span><span className="flex-1 min-w-0"><span className="block text-sm font-semibold">{title}</span><span className="block type-caption mt-0.5 line-clamp-2">{description}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" /></button>;
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return <div className="grid grid-cols-[88px_1fr_38px] gap-3 items-center"><span className="text-sm truncate">{label}</span><div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-foreground" style={{ width: `${max ? Math.max(4, value / max * 100) : 0}%` }} /></div><span className="text-sm font-semibold tabular-nums text-right">{value}</span></div>;
}

export default function Progress() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [range, setRange] = useState<ProgressRangeKey>(readRange);
  const days = PROGRESS_RANGE_DAYS[range];
  const to = useMemo(() => new Date(), []);
  const from = useMemo(() => subDays(to, days - 1), [to, days]);
  const dateRange = useMemo(() => ({ from, to }), [from, to]);
  const { workouts, isLoading: workoutsLoading } = useWorkouts();
  const { data: metrics, isLoading: metricsLoading } = useDailyMetrics(dateRange);
  const { data: calories, isLoading: caloriesLoading } = useCalorieHistory(dateRange);
  const { data: exerciseData, isLoading: setsLoading } = useExerciseSets(dateRange);
  const { data: activities = [] } = useManualActivitiesInRange(from, to);
  const { preferences } = useUserPreferences();

  const nutrition = useQuery({
    queryKey: ['progress-nutrition', user?.id, format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd')],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return [] as Array<{ date: string; calories: number | null; protein: number | null }>;
      const { data, error } = await supabase.from('meals').select('date,calories,protein').eq('user_id', user.id).gte('date', format(from, 'yyyy-MM-dd')).lte('date', format(to, 'yyyy-MM-dd'));
      if (error) throw error;
      return data || [];
    },
  });

  const startKey = format(from, 'yyyy-MM-dd');
  const endKey = format(to, 'yyyy-MM-dd');
  const completedWorkouts = useMemo(() => (workouts || []).filter(workout => workout.date >= startKey && workout.date <= endKey && Boolean(workout.completed_at) && !(workout as typeof workout & { is_skipped?: boolean }).is_skipped), [workouts, startKey, endKey]);
  const weight = useMemo(() => summarizeWeight(metrics?.dataPoints || [], days), [metrics?.dataPoints, days]);
  const sleep = useMemo(() => summarizeSleep(metrics?.dataPoints || []), [metrics?.dataPoints]);
  const completedSets = exerciseData?.sets?.length || 0;
  const durations = completedWorkouts.map(workout => Number(workout.workout_duration_minutes || 0)).filter(value => value > 0);
  const averageDuration = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;
  const loggedNutritionDays = useMemo(() => (calories || []).filter(day => day.intake > 0), [calories]);
  const avgCalories = loggedNutritionDays.length ? Math.round(loggedNutritionDays.reduce((sum, day) => sum + day.intake, 0) / loggedNutritionDays.length) : null;
  const recentWorkouts = useMemo(() => completedWorkouts.slice().sort((a, b) => (b.completed_at || b.date).localeCompare(a.completed_at || a.date)).slice(0, 4), [completedWorkouts]);
  const loading = workoutsLoading || metricsLoading || setsLoading;
  const interpretation = progressInterpretation({ weight, workouts: completedWorkouts.length, rangeDays: days, sleepAverage: sleep.average });

  const nutritionSummary = useMemo(() => {
    const byDay = new Map<string, { calories: number; protein: number }>();
    (nutrition.data || []).forEach(meal => {
      const row = byDay.get(meal.date) || { calories: 0, protein: 0 };
      row.calories += Number(meal.calories || 0);
      row.protein += Number(meal.protein || 0);
      byDay.set(meal.date, row);
    });
    const rows = [...byDay.values()].filter(row => row.calories > 0 || row.protein > 0);
    const target = Number(preferences?.daily_protein_goal || 0);
    return {
      days: rows.length,
      proteinAverage: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.protein, 0) / rows.length) : null,
      targetHits: target > 0 ? rows.filter(row => row.protein >= target).length : null,
      target,
    };
  }, [nutrition.data, preferences?.daily_protein_goal]);

  const muscleDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    (exerciseData?.sets || []).forEach(set => {
      const part = getBodyPart(set.exercise_name);
      if (part === 'Other') return;
      counts.set(part, (counts.get(part) || 0) + 1);
    });
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [exerciseData?.sets]);

  const progressionRows = useMemo(() => (exerciseData?.progressions || []).map(progression => {
    const points = progression.data;
    if (points.length < 3) return { name: progression.exerciseName, status: 'Needs more data' as const, detail: `${points.length} week${points.length === 1 ? '' : 's'} logged` };
    const first = points[0].weight;
    const latest = points[points.length - 1].weight;
    const change = first > 0 ? (latest - first) / first * 100 : 0;
    if (change >= 2) return { name: progression.exerciseName, status: 'Improving' as const, detail: `${Number(first.toFixed(2))} → ${Number(latest.toFixed(2))} kg` };
    return { name: progression.exerciseName, status: 'Stable' as const, detail: `${Number(latest.toFixed(2))} kg recent best` };
  }).sort((a, b) => (a.status === 'Improving' ? -1 : b.status === 'Improving' ? 1 : 0)).slice(0, 5), [exerciseData?.progressions]);

  const activitySummary = useMemo(() => {
    const total = activities.reduce((sum, activity) => sum + Number(activity.duration_minutes || 0), 0);
    const kinds = activities.reduce((map, activity) => { map.set(activity.activity_type, (map.get(activity.activity_type) || 0) + Number(activity.duration_minutes || 0)); return map; }, new Map<string, number>());
    return { total, kinds: [...kinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3) };
  }, [activities]);

  const changeLabel = weight.change == null ? 'Need more data' : `${weight.change > 0 ? '+' : ''}${weight.change.toFixed(2)} kg`;
  const rateLabel = weight.weeklyRate == null ? undefined : `${weight.weeklyRate > 0 ? '+' : ''}${weight.weeklyRate.toFixed(2)} kg/week`;
  const weeklyFrequency = completedWorkouts.length ? completedWorkouts.length / days * 7 : 0;

  return <MainLayout wide>
    <div className="mx-auto w-full max-w-[980px] pb-10">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div><h1 className="type-page-title">Progress</h1><p className="type-supporting mt-1">What happened, and whether the current approach is moving.</p></div>
        <button onClick={() => navigate('/app/settings')} aria-label="Open settings" className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"><Settings2 className="h-5 w-5" /></button>
      </header>

      <div className="inline-flex p-1 rounded-xl bg-muted mb-5" aria-label="Progress range">
        {RANGE_OPTIONS.map(option => <button key={option} onClick={() => { setRange(option); window.localStorage.setItem(RANGE_KEY, option); }} aria-pressed={range === option} className={`min-h-9 px-3 rounded-lg text-xs font-semibold tabular-nums transition-colors ${range === option ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{option}</button>)}
      </div>

      {loading ? <Skeleton variant="rounded" height={210} sx={{ borderRadius: '20px' }} /> : <section className="rounded-[22px] border border-border bg-card overflow-hidden mb-4">
        <div className="p-5 border-b border-border"><div className="type-eyebrow">{range} status</div><p className="mt-2 text-base leading-6 font-medium max-w-2xl">{interpretation}</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5 p-5">
          <Metric label="Bodyweight" value={weight.latest == null ? 'Not logged' : `${weight.latest} kg`} detail={weight.latest != null ? `7-day avg ${weight.average7d ?? '—'} kg` : undefined} />
          <Metric label="Change" value={changeLabel} detail={rateLabel} />
          <Metric label="Training" value={`${completedWorkouts.length} workouts`} detail={completedWorkouts.length ? `${weeklyFrequency.toFixed(1)} / week · ${completedSets} sets` : 'No completed sessions'} />
          <Metric label="Sleep" value={sleep.average == null ? 'Not enough data' : `${sleep.average.toFixed(1)} h`} detail={sleep.observations ? `${sleep.observations} logged nights` : undefined} />
        </div>
      </section>}

      <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-4 items-start">
        <div className="space-y-4">
          <WeightTrendChart metrics={metrics?.dataPoints || []} target={preferences?.weight_goal} />

          <section className="rounded-[20px] border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between"><div><h2 className="text-sm font-semibold">Training distribution</h2><p className="type-caption mt-0.5">Completed working-set count by classified body part. This is distribution, not a hypertrophy score.</p></div><span className="text-sm font-semibold tabular-nums">{completedSets} sets</span></div>
            {muscleDistribution.length ? <div className="p-4 space-y-3">{muscleDistribution.map(row => <Bar key={row.label} label={row.label} value={row.value} max={muscleDistribution[0].value} />)}</div> : <div className="p-5 text-sm text-muted-foreground">Complete a few sessions to see training distribution.</div>}
          </section>

          <section className="rounded-[20px] border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between"><div><h2 className="text-sm font-semibold">Exercise progression</h2><p className="type-caption mt-0.5">Conservative status from weekly heaviest logged loads. Fewer than three weeks stays “Needs more data”.</p></div><button onClick={() => navigate('/app/progress/analytics?tab=training')} className="text-xs font-semibold text-muted-foreground">More</button></div>
            {progressionRows.length ? <div className="divide-y divide-border">{progressionRows.map(row => <div key={row.name} className="px-4 py-3 flex items-center gap-3"><div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{row.name}</div><div className="type-caption mt-0.5 tabular-nums">{row.detail}</div></div><span className="text-xs font-semibold">{row.status}</span></div>)}</div> : <div className="p-5 text-sm text-muted-foreground">Not enough exercise history yet.</div>}
          </section>

          <section className="rounded-[20px] border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between"><div><h2 className="text-sm font-semibold">Recent training</h2><p className="type-caption mt-0.5">Most recent completed sessions in this range</p></div><button onClick={() => navigate('/app/progress/history')} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Timeline</button></div>
            {recentWorkouts.length ? recentWorkouts.map(workout => <button key={workout.id} onClick={() => navigate(`/app/progress/workout/${workout.id}`)} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 border-b border-border last:border-b-0 text-left hover:bg-muted/35 transition-colors"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center"><Dumbbell className="h-4 w-4" /></span><span className="flex-1"><span className="block text-sm font-semibold">{workout.day_name}</span><span className="block type-caption mt-0.5">{workout.date}{workout.workout_duration_minutes ? ` · ${Math.round(workout.workout_duration_minutes)} min` : ''}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>) : <div className="px-5 py-10 text-center"><p className="text-sm font-semibold">No workout history yet.</p><button onClick={() => navigate('/app/train')} className="mt-3 text-sm font-semibold underline underline-offset-4">Start your first workout</button></div>}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border">
            <SectionLink icon={Scale} title="Bodyweight" description={weight.latest == null ? 'Log weigh-ins to establish a trend.' : `${weight.measurements} measurements · ${rateLabel || 'rate needs more data'}`} onClick={() => navigate('/app/progress/analytics?tab=vitals')} />
            <SectionLink icon={Dumbbell} title="Training" description={`${completedSets} completed working sets${averageDuration ? ` · ${averageDuration} min average session` : ''}`} onClick={() => navigate('/app/progress/analytics?tab=training')} />
            <SectionLink icon={Utensils} title="Nutrition" description={caloriesLoading || nutrition.isLoading ? 'Loading…' : nutritionSummary.days === 0 ? 'No logged food in this range.' : `${nutritionSummary.proteinAverage ?? 0} g protein/day across ${nutritionSummary.days} logged days${nutritionSummary.targetHits != null ? ` · target reached on ${nutritionSummary.targetHits}` : ''}. Completeness is unknown.`} onClick={() => navigate('/app/progress/analytics?tab=nutrition')} />
            <SectionLink icon={Moon} title="Recovery" description={sleep.average == null ? 'No logged sleep in this range.' : `${sleep.average.toFixed(1)} h average across ${sleep.observations} logged nights`} onClick={() => navigate('/app/progress/analytics?tab=vitals')} />
            <SectionLink icon={Activity} title="Activity" description={activitySummary.total ? `${Math.round(activitySummary.total)} min logged${activitySummary.kinds.length ? ` · ${activitySummary.kinds.map(([kind, minutes]) => `${kind.replace(/_/g, ' ')} ${Math.round(minutes)}m`).join(' · ')}` : ''}` : 'No walking, running, cycling, or boxing logged in this range.'} onClick={() => navigate('/app/progress/history')} />
          </section>

          <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border">
            <SectionLink icon={HistoryIcon} title="Timeline" description="Workouts, weigh-ins, sleep, food, and activity by day." onClick={() => navigate('/app/progress/history')} />
            <SectionLink icon={BarChart3} title="More metrics" description="Exercise records, deeper training analysis, correlations, and recovery history." onClick={() => navigate('/app/progress/analytics')} />
            <SectionLink icon={Activity} title="Data room" description="Exploratory longitudinal analysis and diagnostics." onClick={() => navigate('/app/progress/dataroom')} />
          </section>
        </div>
      </div>
    </div>
  </MainLayout>;
}
