import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { NextWorkoutCard } from '@/components/dashboard/NextWorkoutCard';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { ProgressInsight } from '@/components/dashboard/ProgressInsight';
import { WeeklyAdaptiveCheckin } from '@/components/dashboard/WeeklyAdaptiveCheckin';
import { LogDateProvider } from '@/contexts/LogDateContext';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';

export default function Dashboard() {
  const navigate = useNavigate(); const { draft, hasProgress } = useDraftWorkout(); const now = new Date();
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  return <MainLayout><AnimatedPage><LogDateProvider><motion.div variants={staggerContainer} initial="hidden" animate="show"><Box sx={{ maxWidth: 680, mx: 'auto', display: 'grid', gap: 2, pb: 5 }}>
    <motion.div variants={staggerItem}><Typography variant="overline" color="text.secondary">{day.toUpperCase()}</Typography><Typography variant="h4" fontWeight={800}>What matters today.</Typography></motion.div>
    {draft && hasProgress ? <motion.div variants={staggerItem}><button onClick={() => navigate('/app/log')} className="w-full rounded-2xl bg-foreground text-background p-5 flex items-center gap-3 text-left"><span className="h-10 w-10 rounded-xl bg-background/15 flex items-center justify-center"><Dumbbell className="h-5 w-5" /></span><span className="flex-1"><span className="block text-[10px] font-bold tracking-[.16em] opacity-60">DO NOW</span><span className="block text-xl font-bold mt-1">Continue {draft.dayName}</span><span className="block text-xs opacity-65 mt-1">Your next unfinished set is waiting.</span></span><ChevronRight className="h-5 w-5" /></button></motion.div>:<motion.div variants={staggerItem}><NextWorkoutCard /></motion.div>}
    <motion.div variants={staggerItem}><TodaySnapshot /></motion.div>
    <motion.div variants={staggerItem}><ProgressInsight /></motion.div>
    <motion.div variants={staggerItem}><WeeklyAdaptiveCheckin /></motion.div>
  </Box></motion.div></LogDateProvider></AnimatedPage></MainLayout>;
}
