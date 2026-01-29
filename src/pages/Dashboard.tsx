import { Link } from 'react-router-dom';
import { Box, Fab } from '@mui/material';
import { Plus, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { ProgressHeader } from '@/components/dashboard/ProgressHeader';
import { TodayStats } from '@/components/dashboard/TodayStats';
import { WaterTracker } from '@/components/dashboard/WaterTracker';
import { CalorieTrackerCompact } from '@/components/health/CalorieTrackerCompact';
import { PersonalRecords } from '@/components/dashboard/PersonalRecords';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
          className="pb-20"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Progress Overview */}
            <motion.div variants={staggerItem}>
              <ProgressHeader />
            </motion.div>

            {/* Today's Stats - Interactive quick actions */}
            <motion.div variants={staggerItem}>
              <TodayStats />
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
                <CollapsibleTrigger className="flex items-center justify-center gap-2 w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border bg-card rounded-2xl">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")} />
                  {showMore ? 'SHOW LESS' : 'MORE'}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <PersonalRecords />
                  <RecentActivity />
                  <Heatmap />
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          </Box>
        </motion.div>
      </AnimatedPage>

      {/* Floating Action Button */}
      <Fab
        component={Link}
        to="/log"
        color="primary"
        aria-label="Log workout"
        sx={{
          position: 'fixed',
          bottom: 88,
          right: 16,
          zIndex: 40,
        }}
      >
        <Plus size={24} />
      </Fab>
    </MainLayout>
  );
}
