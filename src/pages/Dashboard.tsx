import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { ProgressHeader } from '@/components/dashboard/ProgressHeader';

import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { CalorieTrackerCompact } from '@/components/health/CalorieTrackerCompact';

export default function Dashboard() {

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
            {/* Progress Overview */}
            <motion.div variants={staggerItem}>
              <ProgressHeader />
            </motion.div>

            {/* Core Trackers */}
            <motion.div variants={staggerItem} style={{ flex: 1, display: 'flex' }}>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 2,
                alignItems: 'stretch',
                flex: 1,
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
