import { Box } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ruler, SlidersHorizontal } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ResumeSessionCard } from '@/components/dashboard/ResumeSessionCard';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { WeeklyAdaptiveCheckin } from '@/components/dashboard/WeeklyAdaptiveCheckin';
import { LogDateProvider, useLogDate } from '@/contexts/LogDateContext';
import { DashboardDateBar } from '@/components/dashboard/DashboardDateBar';
import { format, isToday } from 'date-fns';

function DashboardContent() {
  const navigate = useNavigate();
  const [checkOpen, setCheckOpen] = useState(false);
  const { logDate } = useLogDate();
  const title = isToday(logDate) ? 'Today' : format(logDate, 'EEE, MMM d');

  return <Box sx={{ maxWidth: 680, mx: 'auto', display: 'grid', gap: 2.5, pb: 5 }}>
    <header className="app-page-header">
      <div className="min-w-0">
        <p className="type-eyebrow">Daily log</p>
        <h1 className="type-page-title">{title}</h1>
        <div className="mt-2"><DashboardDateBar /></div>
      </div>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <button onClick={() => setCheckOpen(true)} aria-label="Open weekly physique and mobility check" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Ruler className="h-4 w-4" /></button>
        <button onClick={() => navigate('/app/settings')} aria-label="Open settings" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><SlidersHorizontal className="h-4 w-4" /></button>
      </Box>
    </header>
    <ResumeSessionCard />
    <TodaySnapshot />
    <WeeklyAdaptiveCheckin open={checkOpen} onOpenChange={setCheckOpen} />
  </Box>;
}

export default function Dashboard() {
  return <MainLayout><LogDateProvider><DashboardContent /></LogDateProvider></MainLayout>;
}
