import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ResumeSessionCard } from '@/components/dashboard/ResumeSessionCard';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { DeficitBalanceSummary } from '@/components/dashboard/DeficitBalanceSummary';
import { LogDateProvider } from '@/contexts/LogDateContext';
import { DashboardDateBar } from '@/components/dashboard/DashboardDateBar';

export default function Dashboard() {
  const navigate = useNavigate();
  return <MainLayout><LogDateProvider><Box sx={{ maxWidth: 680, mx: 'auto', display: 'grid', gap: 2.5, pb: 5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
      <DashboardDateBar />
      <button onClick={() => navigate('/app/settings')} aria-label="Open settings" className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"><SlidersHorizontal className="h-5 w-5" /></button>
    </Box>
    <h1 className="sr-only">Today</h1>
    <ResumeSessionCard />
    <TodaySnapshot />
    <DeficitBalanceSummary />
  </Box></LogDateProvider></MainLayout>;
}
