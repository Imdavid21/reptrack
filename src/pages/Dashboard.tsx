import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { ProgressHeader } from '@/components/dashboard/ProgressHeader';

import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { CalorieTrackerCompact } from '@/components/health/CalorieTrackerCompact';
import { EnergyBalanceCard } from '@/components/health/EnergyBalanceCard';
import { CalorieChart } from '@/components/health/CalorieChart';
import { PersonalRecords } from '@/components/dashboard/PersonalRecords';

export default function Dashboard() {
  return (
    <MainLayout>
      <AnimatedPage>
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

            {/* Energy Balance */}
            <motion.div variants={staggerItem}>
              <EnergyBalanceCard />
            </motion.div>

            {/* Calorie Trends Chart */}
            <motion.div variants={staggerItem}>
              <CalorieChart />
            </motion.div>

            {/* Personal Records */}
            <motion.div variants={staggerItem}>
              <PersonalRecords />
            </motion.div>
          </Box>
        </motion.div>
      </AnimatedPage>
    </MainLayout>
  );
}
