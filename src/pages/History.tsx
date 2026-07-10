import { useState } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { useWorkouts, Workout } from '@/hooks/useWorkouts';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useCalorieHistory } from '@/hooks/useCalorieHistory';
import { useNavigate } from 'react-router-dom';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { Moon, Scale, Dumbbell, Flame, Check, X, MoreHorizontal, ChevronRight, EyeOff, Footprints, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { WorkoutEditSheet } from '@/components/workout/WorkoutEditSheet';
import { cn } from '@/lib/utils';
import { buildDayCalorieEntry, formatCalorieDisplay, type CalorieDisplayMode } from '@/lib/historyCalories';
import { useManualBurns, type BurnEntry } from '@/hooks/useCalorieBurn';
import { ACTIVITY_CONFIG, type ActivityKind } from '@/components/health/ActivityLogger';

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

  const { data: manualBurns = [], deleteBurn } = useManualBurns(daysToShow);

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
    acc[entry.date] = entry.burned;
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

  // Stats
  const thisMonthWorkouts = workouts.filter(w => {
    const d = new Date(w.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const hasAnyHistory = workouts.length > 0 || (metricsData?.dataPoints || []).some(m => (m.sleep_hours && m.sleep_hours > 0) || (m.bodyweight && m.bodyweight > 0)) || (calorieHistory || []).some(e => e.intake > 0 || e.burned > 0) || manualBurns.length > 0;

  return (
    <MainLayout>
      <AnimatedPage>
        <div className="space-y-4 pb-10">
          {!hasAnyHistory ? (
            <motion.div variants={staggerItem} className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <Dumbbell size={40} className="text-muted-foreground/30 mb-4" />
              <p className="text-lg font-semibold text-foreground">No workouts yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
                Your activity will show up here once you log your first session.
              </p>
              <button
                onClick={() => navigate('/app/log')}
                className="btn-brutalist mt-6 px-6 py-2.5 text-sm"
              >
                Start a Workout
              </button>
            </motion.div>
          ) : (
            <>
              {/* Monthly stats row */}
              <motion.div variants={staggerItem} className="grid grid-cols-3 gap-2">
                <div className="card-brutalist text-center !py-4">
                  <div className="text-xl font-bold tabular-nums">{thisMonthWorkouts.length}</div>
                  <div className="text-[9px] text-muted-foreground uppercase mt-1">This Month</div>
                </div>
                <div className="card-brutalist text-center !py-4">
                  <div className="text-xl font-bold tabular-nums">{workouts.length}</div>
                  <div className="text-[9px] text-muted-foreground uppercase mt-1">All Time</div>
                </div>
                <div className="card-brutalist text-center !py-4">
                  <div className="text-xl font-bold tabular-nums">
                    {workouts.length > 0 ? Math.max(...workouts.map(w => w.week_number)) : 0}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase mt-1">Weeks</div>
                </div>
              </motion.div>

              {/* Calorie display toggle */}
              <motion.div variants={staggerItem} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
                  <Flame size={11} /> Calories
                </div>
                <div className="inline-flex rounded-xl bg-muted p-0.5">
                  <button
                    onClick={() => setCalorieMode('net')}
                    className={cn(
                      'px-3 py-1 text-[10px] font-semibold uppercase rounded-lg transition-colors',
                      calorieMode === 'net' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                    )}
                  >
                    Net
                  </button>
                  <button
                    onClick={() => setCalorieMode('split')}
                    className={cn(
                      'px-3 py-1 text-[10px] font-semibold uppercase rounded-lg transition-colors',
                      calorieMode === 'split' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                    )}
                  >
                    Split
                  </button>
                </div>
              </motion.div>

              {/* Timeline */}
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
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
                        'card-brutalist transition-all',
                        !hasAnyData && !isEditing && 'opacity-40',
                        isSkipped && 'opacity-60'
                      )}>
                        {/* Date Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {isToday ? 'Today' : format(date, 'EEE, MMM d')}
                            </span>
                            {isToday && (
                              <span className="badge-modern text-[10px] px-2 py-0.5">TODAY</span>
                            )}
                            {isSkipped && (
                              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                <EyeOff className="h-2.5 w-2.5" />
                                SKIPPED
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
                              className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition-colors"
                            >
                              <MoreHorizontal size={13} />
                            </button>
                          )}
                        </div>

                        {/* Inline Edit Mode */}
                        {isEditing && (
                          <div className="mb-3 p-3 bg-muted/50 rounded-xl animate-fade-in">
                            <div className="flex flex-wrap gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <Moon size={14} className="text-muted-foreground" />
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    placeholder="H"
                                   className="w-12 h-8 rounded-xl border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={editValues.sleepHours}
                                    onChange={(e) => setEditValues(v => ({ ...v, sleepHours: e.target.value }))}
                                    min="0"
                                    max="24"
                                  />
                                  <span className="text-[10px] text-muted-foreground font-medium">hr</span>
                                  <input
                                    type="number"
                                    placeholder="M"
                                    className="w-12 h-8 rounded-xl border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={editValues.sleepMinutes}
                                    onChange={(e) => setEditValues(v => ({ ...v, sleepMinutes: e.target.value }))}
                                    min="0"
                                    max="59"
                                  />
                                  <span className="text-[10px] text-muted-foreground font-medium">min</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Scale size={14} className="text-muted-foreground" />
                                <input
                                  type="number"
                                  placeholder="kg"
                                  className="w-20 h-8 rounded-xl border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                  value={editValues.bodyweight}
                                  onChange={(e) => setEditValues(v => ({ ...v, bodyweight: e.target.value }))}
                                  min="0"
                                  step="0.1"
                                />
                                <span className="text-[10px] text-muted-foreground font-medium">kg</span>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <X size={16} />
                              </button>
                              <button
                                onClick={saveEdit}
                                disabled={isUpserting}
                                className="p-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                              >
                                <Check size={16} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Content */}
                        {hasAnyData && !isEditing && (
                          <div className="flex flex-wrap gap-1.5">
                            {/* Workout chip - navigates to detail */}
                            {dayWorkouts.filter(w => !(w as any)?.is_skipped).map((dayWorkout) => (
                              <button
                                key={dayWorkout.id}
                                onClick={() => navigate(`/app/history/${dayWorkout.id}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity"
                              >
                                <Dumbbell size={13} />
                                <span className="text-xs font-bold">{dayWorkout.day_name}</span>
                                <ChevronRight size={12} className="opacity-50" />
                              </button>
                            ))}

                            {hasSleep && (
                               <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-recover-soft rounded-xl">
                                <Moon size={13} className="text-recover-ink" />
                                <span className="text-xs font-medium text-recover-ink">
                                  {formatSleep(metric.sleep_hours)}
                                </span>
                              </div>
                            )}

                            {hasWeight && (
                               <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/50 rounded-xl">
                                <Scale size={13} className="text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  {metric.bodyweight} kg
                                </span>
                              </div>
                            )}

                            {calorieEntry.hasCalories && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-fuel-soft rounded-xl" title={calorieDisplay.tooltip}>
                                <Flame size={13} className="text-fuel-ink" />
                                <span className="text-xs font-medium text-fuel-ink tabular-nums">
                                  {calorieDisplay.label}
                                </span>
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
                                : ((b.duration_minutes ?? 0) / (config?.paceMinPerKm || 1));
                              return (
                                <div
                                  key={b.id}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-energy-soft rounded-xl"
                                  title={`${label} · ${unitValue} ${unit} · ${b.calories} kcal`}
                                >
                                  <Icon size={13} className="text-energy-ink" />
                                  <span className="text-xs font-medium text-energy-ink tabular-nums">
                                    {label} · {b.calories} kcal
                                  </span>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await deleteBurn.mutateAsync(b.id);
                                        toast.success(`Removed ${label.toLowerCase()}`);
                                      } catch {
                                        toast.error('Failed to remove');
                                      }
                                    }}
                                    className="ml-0.5 p-0.5 text-energy-ink/50 hover:text-destructive transition-colors"
                                    aria-label={`Delete ${label.toLowerCase()} activity`}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              );
                            })}

                          </div>
                        )}

                        {/* Empty state */}
                        {!hasAnyData && !isEditing && (
                          <p className="text-xs text-muted-foreground/50 italic">No activity</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Load more button */}
              <button
                onClick={() => setDaysToShow(prev => prev + 30)}
                className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted/40 transition-colors"
              >
                Load older ({daysToShow} days shown)
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
        </div>
      </AnimatedPage>
    </MainLayout>
  );
}
