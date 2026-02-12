import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { ProgressHeader } from '@/components/dashboard/ProgressHeader';
import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { CalorieTrackerCompact } from '@/components/health/CalorieTrackerCompact';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { getSplitDays } from '@/lib/splitTemplates';
import { useCustomRoutine } from '@/hooks/useCustomRoutine';
import { Dumbbell, ChevronRight, Flame, Play } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

function useWorkoutStreak(workouts: { date: string }[]): number {
  if (workouts.length === 0) return 0;
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 52; i++) {
    const weekStart = startOfWeek(subDays(today, i * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const hasWorkout = workouts.some(w => {
      const d = new Date(w.date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
    if (hasWorkout) streak++;
    else break;
  }
  return streak;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { draft, hasProgress } = useDraftWorkout();
  const { workouts } = useWorkouts();
  const { preferences } = useUserPreferences();
  const { customDays, hasCustomRoutine } = useCustomRoutine();

  const streak = useWorkoutStreak(workouts);

  // Figure out today's scheduled workout day
  const todaySchedule = useMemo(() => {
    const split = preferences?.training_split || 'ppl6';
    const days = hasCustomRoutine && customDays ? customDays : getSplitDays(split);
    const dayEntries = Object.entries(days);
    if (dayEntries.length === 0) return null;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayWorkout = workouts.find(w => w.date === todayStr);
    if (todayWorkout) return { completed: true, dayName: todayWorkout.day_name, dayKey: '' };

    // Find next day based on last workout
    const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
    const lastDayKey = sorted.length > 0 ? sorted[0].day : null;
    const lastIdx = lastDayKey ? dayEntries.findIndex(([k]) => k === lastDayKey) : -1;
    const nextIdx = (lastIdx + 1) % dayEntries.length;
    const [nextKey, nextDay] = dayEntries[nextIdx];
    return { completed: false, dayName: nextDay.name, dayKey: nextKey, focus: nextDay.focus };
  }, [workouts, preferences, hasCustomRoutine, customDays]);

  return (
    <MainLayout>
      <AnimatedPage>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          style={{ minHeight: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>

            {/* Resume workout banner */}
            {draft && hasProgress && (
              <motion.div
                variants={staggerItem}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  onClick={() => navigate('/app/log')}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-foreground text-background active:scale-[0.98] transition-transform"
                >
                  <div className="h-9 w-9 rounded-lg bg-background/15 flex items-center justify-center shrink-0">
                    <Dumbbell className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-bold tracking-wide">Resume Workout</div>
                    <div className="text-[11px] opacity-70 truncate">
                      {draft.dayName} — {draft.exercises.filter(e => e.sets.some(s => s.completed)).length}/{draft.exercises.length} exercises started
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
                </button>
              </motion.div>
            )}

            {/* Today's workout quick-start (only when no draft in progress) */}
            {!(draft && hasProgress) && todaySchedule && !todaySchedule.completed && (
              <motion.div variants={staggerItem}>
                <button
                  onClick={() => navigate('/app/log')}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/50 active:scale-[0.98] transition-all"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-bold">Today: {todaySchedule.dayName}</div>
                    {todaySchedule.focus && (
                      <div className="text-[11px] text-muted-foreground truncate">{todaySchedule.focus}</div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-primary">Start</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </motion.div>
            )}

            {/* Today completed badge */}
            {todaySchedule?.completed && !(draft && hasProgress) && (
              <motion.div variants={staggerItem}>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                    <Dumbbell className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{todaySchedule.dayName} done today</span>
                </div>
              </motion.div>
            )}

            {/* Streak + stats row */}
            {(streak > 0 || workouts.length > 0) && (
              <motion.div variants={staggerItem}>
                <div className="grid grid-cols-3 gap-2">
                  <div className="card-brutalist text-center !py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-lg font-bold tabular-nums">{streak}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground uppercase mt-0.5">Week Streak</div>
                  </div>
                  <div className="card-brutalist text-center !py-3">
                    <div className="text-lg font-bold tabular-nums">
                      {workouts.filter(w => {
                        const d = new Date(w.date);
                        const now = new Date();
                        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                      }).length}
                    </div>
                    <div className="text-[9px] text-muted-foreground uppercase mt-0.5">This Month</div>
                  </div>
                  <div className="card-brutalist text-center !py-3">
                    <div className="text-lg font-bold tabular-nums">{workouts.length}</div>
                    <div className="text-[9px] text-muted-foreground uppercase mt-0.5">All Time</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Progress Overview */}
            <motion.div variants={staggerItem}>
              <ProgressHeader />
            </motion.div>




            {/* Core Trackers */}
            <motion.div variants={staggerItem}>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
                alignItems: 'stretch',
                '& > *': { minHeight: 0 }
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <WaterTracker />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <CalorieTrackerCompact />
                </Box>
              </Box>
            </motion.div>

          </Box>
        </motion.div>
      </AnimatedPage>
    </MainLayout>
  );
}
