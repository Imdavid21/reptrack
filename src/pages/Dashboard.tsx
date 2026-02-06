import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { ProgressHeader } from '@/components/dashboard/ProgressHeader';

import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { CalorieTrackerCompact } from '@/components/health/CalorieTrackerCompact';

import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { preferences } = useUserPreferences();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <AnimatedPage>
        {preferences && !preferences.routine_setup_completed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 border border-primary/20 bg-primary/5 rounded-xl text-center"
          >
            <h3 className="font-bold text-lg mb-2">Setup Your Training Plan</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose your workout split (PPL, Upper/Lower, etc.) to get personalized recommendations.
            </p>
            <Button onClick={() => navigate('/log')} className="gap-2">
              Setup Now <ArrowRight size={16} />
            </Button>
          </motion.div>
        )}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="pb-20"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
