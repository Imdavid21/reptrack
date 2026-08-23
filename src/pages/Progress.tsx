import { useMemo, useState } from 'react';
import { Box, Skeleton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { ChevronRight, Dumbbell, Scale, Moon, Utensils, Activity, BarChart3, History as HistoryIcon, Settings2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useCalorieHistory } from '@/hooks/useCalorieHistory';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { PROGRESS_RANGE_DAYS, progressInterpretation, summarizeSleep, summarizeTraining, summarizeWeight, type ProgressRangeKey } from '@/lib/progressSummary';

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

export default function Progress() {
  const navigate = useNavigate();
  const [range, setRange] = useState<ProgressRangeKey>(readRange);
  const days = PROGRESS_RANGE_DAYS[range];
  const to = useMemo(() => new Date(), []);
  const from = useMemo(() => subDays(to, days - 1), [to, days]);
  const dateRange = useMemo(() => ({ from, to }), [from, to]);
  const { workouts, isLoading: workoutsLoading } = useWorkouts();
  const { data: metrics, isLoading: metricsLoading } = useDailyMetrics(dateRange);
  const { data: calories, isLoading: caloriesLoading } = useCalorieHistory(dateRange);
  const { preferences } = useUserPreferences();

  const startKey = format(from, 'yyyy-MM-dd');
  const endKey = format(to, 'yyyy-MM-dd');
  const weight = useMemo(() => summarizeWeight(metrics?.dataPoints || [], days), [metrics?.dataPoints, days]);
  const sleep = useMemo(() => summarizeSleep(metrics?.dataPoints || []), [metrics?.dataPoints]);
  const training = useMemo(() => summarizeTraining(workouts || [], startKey, endKey), [workouts, startKey, endKey]);
  const loggedNutritionDays = useMemo(() => (calories || []).filter(day => day.intake > 0), [calories]);
  const avgCalories = loggedNutritionDays.length ? Math.round(loggedNutritionDays.reduce((sum, day) => sum + day.intake, 0) / loggedNutritionDays.length) : null;
  const recentWorkouts = useMemo(() => (workouts || []).filter(workout => Boolean(workout.completed_at) && !(workout as typeof workout & { is_skipped?: boolean }).is_skipped).slice(0, 4), [workouts]);
  const loading = workoutsLoading || metricsLoading;
  const interpretation = progressInterpretation({ weight, workouts: training.workouts, rangeDays: days, sleepAverage: sleep.average });

  const changeLabel = weight.change == null ? 'Need more data' : `${weight.change > 0 ? '+' : ''}${weight.change.toFixed(2)} kg`;
  const rateLabel = weight.weeklyRate == null ? undefined : `${weight.weeklyRate > 0 ? '+' : ''}${weight.weeklyRate.toFixed(2)} kg/week`;
  const weeklyFrequency = training.workouts ? training.workouts / days * 7 : 0;

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
          <Metric label="Training" value={`${training.workouts} workouts`} detail={training.workouts ? `${weeklyFrequency.toFixed(1)} / week` : 'No completed sessions'} />
          <Metric label="Sleep" value={sleep.average == null ? 'Not enough data' : `${sleep.average.toFixed(1)} h`} detail={sleep.observations ? `${sleep.observations} logged nights` : undefined} />
        </div>
      </section>}

      <div className="grid md:grid-cols-[1.15fr_.85fr] gap-4 items-start">
        <section className="rounded-[20px] border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between"><div><h2 className="text-sm font-semibold">Recent training</h2><p className="type-caption mt-0.5">Most recent completed sessions</p></div><button onClick={() => navigate('/app/progress/history')} className="text-xs font-semibold text-muted-foreground hover:text-foreground">History</button></div>
          {recentWorkouts.length ? recentWorkouts.map(workout => <button key={workout.id} onClick={() => navigate(`/app/progress/workout/${workout.id}`)} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 border-b border-border last:border-b-0 text-left hover:bg-muted/35 transition-colors"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center"><Dumbbell className="h-4 w-4" /></span><span className="flex-1"><span className="block text-sm font-semibold">{workout.day_name}</span><span className="block type-caption mt-0.5">{workout.date}{workout.workout_duration_minutes ? ` · ${Math.round(workout.workout_duration_minutes)} min` : ''}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>) : <div className="px-5 py-10 text-center"><p className="text-sm font-semibold">No workout history yet.</p><button onClick={() => navigate('/app/train')} className="mt-3 text-sm font-semibold underline underline-offset-4">Start your first workout</button></div>}
        </section>

        <div className="space-y-4">
          <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border">
            <SectionLink icon={Scale} title="Bodyweight" description={weight.latest == null ? 'Log weigh-ins to establish a trend.' : `${weight.measurements} measurements · ${rateLabel || 'rate needs more data'}`} onClick={() => navigate('/app/progress/analytics?tab=vitals')} />
            <SectionLink icon={Dumbbell} title="Training" description={`${training.sets} logged working sets${training.averageDuration ? ` · ${training.averageDuration} min average session` : ''}`} onClick={() => navigate('/app/progress/analytics?tab=training')} />
            <SectionLink icon={Utensils} title="Nutrition" description={caloriesLoading ? 'Loading…' : avgCalories == null ? 'No logged food in this range.' : `~${avgCalories.toLocaleString()} kcal on ${loggedNutritionDays.length} logged days. Not a completeness score.`} onClick={() => navigate('/app/progress/analytics?tab=nutrition')} />
            <SectionLink icon={Moon} title="Recovery" description={sleep.average == null ? 'No logged sleep in this range.' : `${sleep.average.toFixed(1)} h average across logged nights`} onClick={() => navigate('/app/progress/analytics?tab=vitals')} />
          </section>

          <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border">
            <SectionLink icon={HistoryIcon} title="Timeline" description="Workouts, weigh-ins, sleep, food, and activity by day." onClick={() => navigate('/app/progress/history')} />
            <SectionLink icon={BarChart3} title="More metrics" description="Exercise progression, records, training distribution, and deeper analytics." onClick={() => navigate('/app/progress/analytics')} />
            <SectionLink icon={Activity} title="Data room" description="Exploratory longitudinal analysis and diagnostics." onClick={() => navigate('/app/progress/dataroom')} />
          </section>
        </div>
      </div>
    </div>
  </MainLayout>;
}
