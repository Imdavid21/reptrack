import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { ProgressHeader } from '@/components/dashboard/ProgressHeader';
import { NextWorkoutCard } from '@/components/dashboard/NextWorkoutCard';
import { AdaptiveSuggestionsCard } from '@/components/adaptive/AdaptiveSuggestionsCard';
import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { CalorieTrackerCompact } from '@/components/health/CalorieTrackerCompact';
import { ActivityLogger } from '@/components/health/ActivityLogger';
import { DashboardDateBar } from '@/components/dashboard/DashboardDateBar';
import { LogDateProvider } from '@/contexts/LogDateContext';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Dumbbell, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { draft, hasProgress } = useDraftWorkout();
  const { preferences } = useUserPreferences();

  return (
    <MainLayout>
      <AnimatedPage>
       <LogDateProvider>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          style={{ minHeight: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>

            {/* Single shared date control for all dashboard logging */}
            <motion.div variants={staggerItem}>
              <DashboardDateBar />
            </motion.div>

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

            {/* Adaptive next-workout hero (hidden while a draft is in progress) */}
            {!(draft && hasProgress) && (
              <motion.div variants={staggerItem}>
                <NextWorkoutCard />
              </motion.div>
            )}

            {preferences?.adaptive_mode_enabled && (
              <motion.div variants={staggerItem}>
                <AdaptiveSuggestionsCard />
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

            <motion.div variants={staggerItem}>
              <ActivityLogger />
            </motion.div>


          </Box>
        </motion.div>
       </LogDateProvider>
      </AnimatedPage>
    </MainLayout>
  );
}
