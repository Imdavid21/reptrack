import { Link } from 'react-router-dom';
import { Box, Typography, Fab } from '@mui/material';
import { Plus, TrendingUp, Flame, Droplets, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { ProgressHeader } from '@/components/dashboard/ProgressHeader';
import { DailyRitualCard } from '@/components/dashboard/DailyRitualCard';
import { QuickActionsBar } from '@/components/dashboard/QuickActionsBar';
import { TodayStats } from '@/components/dashboard/TodayStats';
import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { CalorieTrackerCompact } from '@/components/health/CalorieTrackerCompact';
import { PersonalRecords } from '@/components/dashboard/PersonalRecords';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { GlassCard } from '@/components/ui/GlassCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [showMore, setShowMore] = useState(false);

  return (
    <MainLayout>
      <AnimatedPage>
        <motion.div 
          variants={staggerContainer} 
          initial="hidden" 
          animate="show"
          className="pb-24"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Progress Overview */}
            <motion.div variants={staggerItem}>
              <ProgressHeader />
            </motion.div>

            {/* Quick Actions Bar */}
            <motion.div variants={staggerItem}>
              <QuickActionsBar />
            </motion.div>

            {/* Today's Stats (horizontal scroll) */}
            <motion.div variants={staggerItem}>
              <TodayStats />
            </motion.div>

            {/* Time-Aware Daily Ritual Card */}
            <motion.div variants={staggerItem}>
              <DailyRitualCard />
            </motion.div>

            {/* Core Trackers */}
            <motion.div variants={staggerItem}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <WaterTracker />
                <CalorieTrackerCompact />
              </Box>
            </motion.div>

            {/* Collapsible More Section */}
            <motion.div variants={staggerItem}>
              <Collapsible open={showMore} onOpenChange={setShowMore}>
                <CollapsibleTrigger asChild>
                  <motion.button 
                    className={cn(
                      "flex items-center justify-center gap-2 w-full py-3.5",
                      "text-sm text-muted-foreground hover:text-foreground",
                      "transition-all duration-300",
                      "border border-border bg-card/50 backdrop-blur-sm rounded-2xl",
                      "hover:bg-card"
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      animate={{ rotate: showMore ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>
                    <span className="font-medium tracking-wide">
                      {showMore ? 'SHOW LESS' : 'MORE INSIGHTS'}
                    </span>
                  </motion.button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <motion.div 
                    className="space-y-4 mt-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <PersonalRecords />
                    <RecentActivity />
                    <Heatmap />
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          </Box>
        </motion.div>
      </AnimatedPage>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.4 }}
        style={{
          position: 'fixed',
          bottom: 100,
          right: 16,
          zIndex: 40,
        }}
      >
        <Fab
          component={Link}
          to="/log"
          color="primary"
          aria-label="Log workout"
          sx={{
            width: 56,
            height: 56,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}
        >
          <Plus size={24} />
        </Fab>
      </motion.div>
    </MainLayout>
  );
}