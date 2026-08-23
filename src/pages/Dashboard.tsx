import { Box } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ruler, SlidersHorizontal } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ResumeSessionCard } from '@/components/dashboard/ResumeSessionCard';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { WeeklyAdaptiveCheckin } from '@/components/dashboard/WeeklyAdaptiveCheckin';
import { LogDateProvider } from '@/contexts/LogDateContext';
import { DashboardDateBar } from '@/components/dashboard/DashboardDateBar';

export default function Dashboard() {
  const navigate = useNavigate(); const [checkOpen, setCheckOpen] = useState(false);
  return <MainLayout><LogDateProvider><Box sx={{ maxWidth: 680, mx: 'auto', display: 'grid', gap: 2.5, pb: 5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><DashboardDateBar /><Box sx={{ display: 'flex', gap: 1 }}><button onClick={() => setCheckOpen(true)} aria-label="Open weekly physique and mobility check" className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Ruler className="h-5 w-5" /></button><button onClick={() => navigate('/app/settings')} aria-label="Open settings" className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><SlidersHorizontal className="h-5 w-5" /></button></Box></Box>
    <h1 className="sr-only">Dashboard</h1>
    <ResumeSessionCard />
    <TodaySnapshot />
    <WeeklyAdaptiveCheckin open={checkOpen} onOpenChange={setCheckOpen} />
  </Box></LogDateProvider></MainLayout>;
}
