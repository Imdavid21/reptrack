import { useState } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { useWorkouts, Workout } from '@/hooks/useWorkouts';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useCalorieHistory } from '@/hooks/useCalorieHistory';
import { useNavigate } from 'react-router-dom';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { Moon, Scale, Dumbbell, Flame, Check, X, MoreHorizontal, ChevronRight, EyeOff, Footprints, Trash2, Edit } from 'lucide-react';
import { toast } from '@/lib/toast';
import { WorkoutEditSheet } from '@/components/workout/WorkoutEditSheet';
import { cn } from '@/lib/utils';
import { buildDayCalorieEntry, formatCalorieDisplay, type CalorieDisplayMode } from '@/lib/historyCalories';
import { parseDateKey } from '@/lib/dateKey';
import { useManualBurns, type BurnEntry } from '@/hooks/useCalorieBurn';
import { ACTIVITY_CONFIG, type ActivityKind } from '@/components/health/ActivityLogger';
import { EditActivityDialog } from '@/components/health/EditActivityDialog';

export default function History() {
  const { workouts } = useWorkouts();
  const navigate = useNavigate();

  const [daysToShow, setDaysToShow] = useState(30);
  const [calorieMode, setCalorieMode] = useState<CalorieDisplayMode>('net');

  const { data: metricsData, upsertMetrics, isUpserting } = useDailyMetrics({
    from: subDays(new Date(), daysToShow),
    to: new Date(),
  });

  const { data: calorieHistory } = useCalorieHistory({
    from: subDays(new Date(), daysToShow - 1),
    to: new Date(),
  });

  const { data: manualBurns = [], deleteBurn, updateBurn } = useManualBurns(daysToShow);
  const [editingBurn, setEditingBurn] = useState<BurnEntry | null>(null);

  const burnsByDateList = manualBurns.reduce((acc, b) => {
    if (!acc[b.date]) acc[b.date] = [];
    acc[b.date].push(b);
    return acc;
  }, {} as Record<string, BurnEntry[]>);

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [selectedWorkoutForEdit, setSelectedWorkoutForEdit] = useState<Workout | null>(null);
  const [selectedEditDate, setSelectedEditDate] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    sleepHours: string;
    sleepMinutes: string;
    bodyweight: string;
  }>({ sleepHours: '', sleepMinutes: '', bodyweight: '' });

  const visibleDays = eachDayOfInterval({
    start: subDays(startOfDay(new Date()), daysToShow - 1),
    end: startOfDay(new Date()),
  }).reverse();

  const workoutsByDateList = workouts.reduce((acc, w) => {
    if (!acc[w.date]) acc[w.date] = [];
    acc[w.date].push(w);
    return acc;
  }, {} as Record<string, typeof workouts>);

  const metricsByDate = (metricsData?.dataPoints || []).reduce((acc, m) => {
    acc[m.date] = m;
    return acc;
  }, {} as Record<string, typeof metricsData.dataPoints[0]>);

  const caloriesByDate = (calorieHistory || []).reduce((acc, entry) => {
    acc[entry.date] = entry.intake;
    return acc;
  }, {} as Record<string, number>);

  const burnsByDate = (calorieHistory || []).reduce((acc, entry) => {
    acc[entry.date] = entry.expenditure;
    return acc;
  }, {} as Record<string, number>);

  const startEdit = (dateStr: string) => {
    const metric = metricsByDate[dateStr];
    const sleepHours = metric?.sleep_hours || 0;
    const h = Math.floor(sleepHours);
    const m = Math.round((sleepHours - h) * 60);

    setEditingDate(dateStr);
    setEditValues({
      sleepHours: h > 0 ? String(h) : '',
      sleepMinutes: m > 0 ? String(m) : '',
      bodyweight: metric?.bodyweight ? String(metric.bodyweight) : '',
    });
  };

  const cancelEdit = () => {
    setEditingDate(null);
    setEditValues({ sleepHours: '', sleepMinutes: '', bodyweight: '' });
  };

  const saveEdit = async () => {
    if (!editingDate) return;

    try {
      const hours = parseInt(editValues.sleepHours) || 0;
      const minutes = parseInt(editValues.sleepMinutes) || 0;
      const sleepDecimal = hours + (minutes / 60);

      await upsertMetrics({
        date: editingDate,
        sleep_hours: sleepDecimal > 0 ? sleepDecimal : undefined,
        bodyweight: editValues.bodyweight ? parseFloat(editValues.bodyweight) : undefined,
      });
      toast.success('Saved');
      setEditingDate(null);
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const formatSleep = (hours: number | null) => {
    if (!hours) return null;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const thisMonthWorkouts = workouts.filter(w => {
    const d = parseDateKey(w.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const hasAnyHistory = workouts.length > 0 || (metricsData?.dataPoints || []).some(m => (m.sleep_hours && m.sleep_hours > 0) || (m.bodyweight && m.bodyweight > 0)) || (calorieHistory || []).some(e => e.intake > 0 || e.burned > 0) || manualBurns.length > 0;

  return (
    <MainLayout>
      <AnimatedPage>
        <div className="space-y-5 pb-10">
          <header className="app-page-header">
            <div>
              <p className="type-eyebrow">Training log</p>
              <h1 className="type-page-title">History</h1>
            </div>
            <span className="type-meta tabular-nums">{daysToShow} days</span>
          </header>

          {!hasAnyHistory ? (
            <motion.div variants={staggerItem} className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <Dumbbell size={40} className="mb-4 text-muted-foreground/30" />
              <p className="type-card-title text-foreground">No workouts yet</p>
              <p className="type-supporting mt-1 max-w-[240px]">
                Your activity will show up here once you log your first session.
              </p>
              <button onClick={() => navigate('/app/log')} className="btn-brutalist mt-6 px-6">
                Start workout
              </button>
            </motion.div>
          ) : (
            <>
              <motion.div variants={staggerItem} className="grid grid-cols-3 gap-2">
                <div className="surface-standard p-4 text-center">
                  <div className="type-card-title tabular-nums">{thisMonthWorkouts.length}</div>
                  <div className="type-caption mt-1">This month</div>
                </div>
                <div className="surface-standard p-4 text-center">
                  <div className="type-card-title tabular-nums">{workouts.length}</div>
                  <div className="type-caption mt-1">All time</div>
                </div>
                <div className="surface-standard p-4 text-center">
                  <div className="type-card-title tabular-nums">
                    {workouts.length > 0 ? Math.max(...workouts.map(w => w.week_number)) : 0}
                  </div>
                  <div className="type-caption mt-1">Weeks</div>
                </div>
              </motion.div>

              <motion.div variants={staggerItem} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 type-caption">
                  <Flame size={16} /> Calories
                </div>
                <div className="inline-flex rounded-xl border border-border bg-muted/35 p-1">
                  <button
                    onClick={() => setCalorieMode('net')}
                    className={cn(
                      'h-9 rounded-lg px-3 type-action transition-colors',
                      calorieMode === 'net' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                    )}
                  >
                    Net
                  </button>
                  <button
                    onClick={() => setCalorieMode('split')}
                    className={cn(
                      'h-9 rounded-lg px-3 type-action transition-colors',
                      calorieMode === 'split' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                    )}
                  >
                    Split
                  </button>
                </div>
              </motion.div>

              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                {visibleDays.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const dayWorkouts = workoutsByDateList[dateStr] || [];
                  const workout = dayWorkouts[0];
                  const metric = metricsByDate[dateStr];
                  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
                  const isEditing = editingDate === dateStr;

                  const hasSleep = metric?.sleep_hours && metric.sleep_hours > 0;
                  const hasWeight = metric?.bodyweight && metric.bodyweight > 0;
                  const calorieEntry = buildDayCalorieEntry(caloriesByDate[dateStr], burnsByDate[dateStr]);
                  const calorieDisplay = formatCalorieDisplay(calorieEntry, calorieMode);
                  const dayBurns = burnsByDateList[dateStr] || [];
                  const hasAnyData = workout || hasSleep || hasWeight || calorieEntry.hasCalories || dayBurns.length > 0;
                  const isSkipped = (workout as any)?.is_skipped;

                  return (
                    <motion.div key={dateStr} variants={staggerItem}>
                      <div className={cn(
                        'surface-standard p-4 transition-opacity',
                        !hasAnyData && !isEditing && 'opacity-40',
                        isSkipped && 'opacity-60'
                      )}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="type-action truncate">
                              {isToday ? 'Today' : format(date, 'EEE, MMM d')}
                            </span>
                            {isSkipped && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 type-meta">
                                <EyeOff className="h-3 w-3" />
                                Skipped
                              </span>
                            )}
                          </div>

                          {!isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWorkoutForEdit(workout || null);
                                setSelectedEditDate(dateStr);
                              }}
                              aria-label={`Edit ${isToday ? 'today' : format(date, 'MMM d')} history`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          )}
                        </div>

                        {isEditing && (
                          <div className="mb-3 animate-fade-in rounded-xl border border-border bg-muted/30 p-3">
                            <div className="mb-3 flex flex-wrap gap-3">
                              <div className="flex items-center gap-2">
                                <Moon size={16} className="text-muted-foreground" />
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    placeholder="H"
                                    className="h-9 w-12 rounded-xl border border-input bg-background px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={editValues.sleepHours}
                                    onChange={(e) => setEditValues(v => ({ ...v, sleepHours: e.target.value }))}
                                    min="0"
                                    max="24"
                                  />
                                  <span className="type-meta">hr</span>
                                  <input
                                    type="number"
                                    placeholder="M"
                                    className="h-9 w-12 rounded-xl border border-input bg-background px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={editValues.sleepMinutes}
                                    onChange={(e) => setEditValues(v => ({ ...v, sleepMinutes: e.target.value }))}
                                    min="0"
                                    max="59"
                                  />
                                  <span className="type-meta">min</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Scale size={16} className="text-muted-foreground" />
                                <input
                                  type="number"
                                  placeholder="kg"
                                  className="h-9 w-20 rounded-xl border border-input bg-background px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                                  value={editValues.bodyweight}
                                  onChange={(e) => setEditValues(v => ({ ...v, bodyweight: e.target.value }))}
                                  min="0"
                                  step="0.1"
                                />
                                <span className="type-meta">kg</span>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button onClick={cancelEdit} aria-label="Cancel editing" className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                <X size={16} />
                              </button>
                              <button onClick={saveEdit} aria-label="Save history changes" disabled={isUpserting} className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                                <Check size={16} />
                              </button>
                            </div>
                          </div>
                        )}

                        {hasAnyData && !isEditing && (
                          <div className="flex flex-wrap gap-2">
                            {dayWorkouts.filter(w => !(w as any)?.is_skipped).map((dayWorkout) => (
                              <button
                                key={dayWorkout.id}
                                onClick={() => navigate(`/app/history/${dayWorkout.id}`)}
                                className="flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-3 type-action text-background transition-opacity hover:opacity-90"
                              >
                                <Dumbbell size={16} />
                                <span>{dayWorkout.day_name}</span>
                                <ChevronRight size={14} className="opacity-50" />
                              </button>
                            ))}

                            {hasSleep && (
                              <div className="flex min-h-9 items-center gap-1.5 rounded-full bg-recover-soft px-3 type-caption text-recover-ink">
                                <Moon size={14} />
                                <span className="tabular-nums">{formatSleep(metric.sleep_hours)}</span>
                              </div>
                            )}

                            {hasWeight && (
                              <div className="flex min-h-9 items-center gap-1.5 rounded-full bg-muted px-3 type-caption">
                                <Scale size={14} />
                                <span className="tabular-nums">{metric.bodyweight} kg</span>
                              </div>
                            )}

                            {calorieEntry.hasCalories && (
                              <div className="flex min-h-9 items-center gap-1.5 rounded-full bg-fuel-soft px-3 type-caption text-fuel-ink" title={calorieDisplay.tooltip}>
                                <Flame size={14} />
                                <span className="tabular-nums">{calorieDisplay.label}</span>
                              </div>
                            )}

                            {dayBurns.map((b) => {
                              const type = (b.activity_type || '') as ActivityKind;
                              const config = ACTIVITY_CONFIG[type];
                              const Icon = config?.icon || Footprints;
                              const label = config?.label || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Activity');
                              const unit = config?.unit === 'min' ? 'min' : 'km';
                              const unitValue = config?.unit === 'min'
                                ? (b.duration_minutes ?? 0)
                                : (b.distance_km ?? ((b.duration_minutes ?? 0) / (config?.paceMinPerKm || 1)));
                              return (
                                <div key={b.id} className="flex min-h-9 items-center gap-1 rounded-xl bg-energy-soft pl-3 pr-1 text-energy-ink" title={`${label} · ${unitValue} ${unit} · ${b.calories} kcal`}>
                                  <Icon size={14} />
                                  <span className="type-caption tabular-nums text-energy-ink">{label} · {b.calories} kcal</span>
                                  <button onClick={() => setEditingBurn(b)} className="flex h-8 w-8 items-center justify-center rounded-lg text-energy-ink/60 transition-colors hover:bg-background/50 hover:text-foreground" aria-label={`Edit ${label.toLowerCase()} activity`}>
                                    <Edit size={13} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await deleteBurn.mutateAsync(b.id);
                                        toast.success(`Removed ${label.toLowerCase()}`);
                                      } catch {
                                        toast.error('Failed to remove');
                                      }
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-energy-ink/60 transition-colors hover:bg-background/50 hover:text-destructive"
                                    aria-label={`Delete ${label.toLowerCase()} activity`}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!hasAnyData && !isEditing && (
                          <p className="type-caption italic">No activity</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              <button
                onClick={() => setDaysToShow(prev => prev + 30)}
                className="control-standard w-full border border-border bg-card px-4 type-action text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                Load older · {daysToShow} days shown
              </button>
            </>
          )}

          <WorkoutEditSheet
            workout={selectedWorkoutForEdit}
            open={!!selectedWorkoutForEdit || !!selectedEditDate}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedWorkoutForEdit(null);
                setSelectedEditDate(null);
              }
            }}
            onEditVitals={() => {
              if (selectedEditDate) {
                startEdit(selectedEditDate);
                setSelectedWorkoutForEdit(null);
                setSelectedEditDate(null);
              }
            }}
            dateStr={selectedEditDate || undefined}
          />

          <EditActivityDialog
            burn={editingBurn}
            onClose={() => setEditingBurn(null)}
            onSave={(input) => updateBurn.mutateAsync(input)}
            onDelete={(id) => deleteBurn.mutateAsync(id)}
          />
        </div>
      </AnimatedPage>
    </MainLayout>
  );
}
