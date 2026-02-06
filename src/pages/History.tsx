import { useState } from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { useWorkouts, Workout } from '@/hooks/useWorkouts';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useCalorieHistory } from '@/hooks/useMeals';
import { useNavigate } from 'react-router-dom';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { Edit2, Moon, Scale, Dumbbell, Flame, Check, X, MoreHorizontal } from 'lucide-react';
import { toast } from '@/lib/toast';
import { WorkoutEditSheet } from '@/components/workout/WorkoutEditSheet';

export default function History() {
  const { workouts } = useWorkouts();
  const navigate = useNavigate();

  // Get last 30 days of metrics
  const { data: metricsData, upsertMetrics, isUpserting } = useDailyMetrics({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Get calorie history for the last 30 days
  const { data: calorieHistory } = useCalorieHistory(30);

  // Editing state
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [selectedWorkoutForEdit, setSelectedWorkoutForEdit] = useState<Workout | null>(null);
  const [editValues, setEditValues] = useState<{
    sleepHours: string;
    sleepMinutes: string;
    bodyweight: string;
  }>({ sleepHours: '', sleepMinutes: '', bodyweight: '' });

  // Build a combined timeline of the last 30 days
  const last30Days = eachDayOfInterval({
    start: subDays(startOfDay(new Date()), 29),
    end: startOfDay(new Date()),
  }).reverse();

  // Create a map for quick lookup
  const workoutsByDate = workouts.reduce((acc, w) => {
    acc[w.date] = w;
    return acc;
  }, {} as Record<string, typeof workouts[0]>);

  const metricsByDate = (metricsData?.dataPoints || []).reduce((acc, m) => {
    acc[m.date] = m;
    return acc;
  }, {} as Record<string, typeof metricsData.dataPoints[0]>);

  // Build calorie lookup by date
  const caloriesByDate = (calorieHistory || []).reduce((acc, entry) => {
    acc[entry.date] = entry.calories;
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

  return (
    <MainLayout title="HISTORY">
      <AnimatedPage>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 10 }}>

          {/* Daily Timeline */}
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            {last30Days.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const workout = workoutsByDate[dateStr];
              const metric = metricsByDate[dateStr];
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
              const isEditing = editingDate === dateStr;

              const hasSleep = metric?.sleep_hours && metric.sleep_hours > 0;
              const hasWeight = metric?.bodyweight && metric.bodyweight > 0;
              const hasCalories = caloriesByDate[dateStr] && caloriesByDate[dateStr] > 0;
              const hasAnyData = workout || hasSleep || hasWeight || hasCalories;
              const isSkipped = (workout as any)?.is_skipped;

              return (
                <motion.div key={dateStr} variants={staggerItem}>
                  <div className={`card-brutalist mb-4 transition-opacity ${!hasAnyData && !isEditing ? 'opacity-50' : 'opacity-100'} ${isSkipped ? 'opacity-70 bg-muted/20' : ''}`}>
                    {/* Date Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {isToday ? 'Today' : format(date, 'EEE, MMM d')}
                        </span>
                        {isToday && (
                          <span className="badge-modern text-[10px] px-2 py-0.5">TODAY</span>
                        )}
                        {isSkipped && (
                          <span className="badge-brutalist text-[10px] px-2 py-0.5 bg-muted text-muted-foreground border-dashed">SKIPPED</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(dateStr)}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {workout && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorkoutForEdit(workout);
                            }}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Edit Mode */}
                    {isEditing && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-xl animate-fade-in">
                        <div className="flex flex-wrap gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Moon size={14} className="text-muted-foreground" />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="H"
                                className="w-12 h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={editValues.sleepHours}
                                onChange={(e) => setEditValues(v => ({ ...v, sleepHours: e.target.value }))}
                                min="0"
                                max="24"
                              />
                              <span className="text-xs text-muted-foreground">:</span>
                              <input
                                type="number"
                                placeholder="M"
                                className="w-12 h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={editValues.sleepMinutes}
                                onChange={(e) => setEditValues(v => ({ ...v, sleepMinutes: e.target.value }))}
                                min="0"
                                max="59"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Scale size={14} className="text-muted-foreground" />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="kg"
                                className="w-20 h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={editValues.bodyweight}
                                onChange={(e) => setEditValues(v => ({ ...v, bodyweight: e.target.value }))}
                                min="0"
                                step="0.1"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={saveEdit}
                            disabled={isUpserting}
                            className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Content Grid */}
                    {hasAnyData && !isEditing && (
                      <div className="flex flex-wrap gap-2">
                        {/* Workout */}
                        {workout && !isSkipped && (
                          <div
                            onClick={() => navigate(`/history/${workout.id}`)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            <Dumbbell size={14} />
                            <span className="text-xs font-bold">{workout.day_name}</span>
                          </div>
                        )}

                        {/* Sleep */}
                        {hasSleep && (
                          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/50 rounded-lg">
                            <Moon size={14} className="text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              {formatSleep(metric.sleep_hours)}
                            </span>
                          </div>
                        )}

                        {/* Weight */}
                        {hasWeight && (
                          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/50 rounded-lg">
                            <Scale size={14} className="text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              {metric.bodyweight} kg
                            </span>
                          </div>
                        )}

                        {/* Calories */}
                        {hasCalories && (
                          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/50 rounded-lg">
                            <Flame size={14} className="text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              {caloriesByDate[dateStr].toLocaleString()} cal
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Empty state */}
                    {!hasAnyData && !isEditing && (
                      <p className="text-xs text-muted-foreground/50 italic">
                        No activity
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <WorkoutEditSheet
            workout={selectedWorkoutForEdit}
            open={!!selectedWorkoutForEdit}
            onOpenChange={(open) => !open && setSelectedWorkoutForEdit(null)}
          />

          {/* Stats summary */}
          {workouts.length > 0 && (
            <motion.div variants={staggerItem}>
              <div className="card-brutalist">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold tabular-nums">
                      {workouts.length}
                    </h3>
                    <p className="text-xs text-muted-foreground uppercase">
                      Total Sessions
                    </p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-xl font-bold tabular-nums">
                      {Math.max(...workouts.map((w) => w.week_number))}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Weeks Completed
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </Box>
      </AnimatedPage>
    </MainLayout>
  );
}
