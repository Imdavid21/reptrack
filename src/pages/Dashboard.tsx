import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell, Ruler, SlidersHorizontal } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { NextWorkoutCard } from '@/components/dashboard/NextWorkoutCard';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { WeeklyAdaptiveCheckin } from '@/components/dashboard/WeeklyAdaptiveCheckin';
import { LogDateProvider } from '@/contexts/LogDateContext';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { DashboardDateBar } from '@/components/dashboard/DashboardDateBar';

export default function Dashboard() {
  const navigate = useNavigate(); const { draft, hasProgress } = useDraftWorkout(); const [checkOpen, setCheckOpen] = useState(false);
  return <MainLayout><LogDateProvider><Box sx={{ maxWidth: 680, mx: 'auto', display: 'grid', gap: 2.5, pb: 5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><DashboardDateBar /><Box sx={{ display: 'flex', gap: 1 }}><button onClick={() => setCheckOpen(true)} aria-label="Open weekly physique and mobility check" className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Ruler className="h-5 w-5" /></button><button onClick={() => navigate('/app/settings')} aria-label="Open settings" className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><SlidersHorizontal className="h-5 w-5" /></button></Box></Box>
    {draft && hasProgress ? <button onClick={() => navigate('/app/log')} className="w-full rounded-[24px] bg-foreground text-background p-5 flex items-center gap-3 text-left active:scale-[.99] transition-transform"><span className="h-10 w-10 rounded-xl bg-background/15 flex items-center justify-center"><Dumbbell className="h-5 w-5" /></span><span className="flex-1"><span className="block text-[10px] font-bold tracking-[.16em] opacity-60">RESUME</span><span className="block text-xl font-bold mt-1">{draft.exercises[draft.currentExerciseIndex]?.name || draft.dayName}</span><span className="block text-xs opacity-65 mt-1">Set {(draft.currentSetIndex || 0) + 1} · {draft.dayName}</span></span><ChevronRight className="h-5 w-5" /></button>:<NextWorkoutCard />}
    <Box><Typography variant="overline" color="text.secondary">DAILY</Typography><TodaySnapshot /></Box>
    <WeeklyAdaptiveCheckin open={checkOpen} onOpenChange={setCheckOpen} />
  </Box></LogDateProvider></MainLayout>;
}
