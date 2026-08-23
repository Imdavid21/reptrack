import { Box } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TodayHero } from '@/components/dashboard/TodayHero';
import { TodaySnapshot } from '@/components/dashboard/TodaySnapshot';
import { WeeklyAdaptiveCheckin } from '@/components/dashboard/WeeklyAdaptiveCheckin';
import { LogDateProvider } from '@/contexts/LogDateContext';
import { DashboardDateBar } from '@/components/dashboard/DashboardDateBar';

export default function Dashboard() {
  const navigate = useNavigate();
  const [checkOpen, setCheckOpen] = useState(false);

  return (
    <MainLayout>
      <LogDateProvider>
        <Box sx={{ maxWidth: 760, mx: 'auto', display: 'grid', gap: 2.5, pb: 4 }}>
          <header className="flex items-center justify-between gap-3">
            <DashboardDateBar />
            <button
              onClick={() => navigate('/app/settings')}
              aria-label="Open settings"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <SettingsIcon className="h-5 w-5" />
            </button>
          </header>

          <h1 className="sr-only">Today</h1>
          <TodayHero />
          <TodaySnapshot />

          <button
            onClick={() => setCheckOpen(true)}
            className="flex min-h-14 w-full items-center justify-between border-t border-border py-3 text-left"
          >
            <span>
              <span className="block text-sm font-medium">Weekly check</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">A short physique and mobility check when you want it.</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <WeeklyAdaptiveCheckin open={checkOpen} onOpenChange={setCheckOpen} />
        </Box>
      </LogDateProvider>
    </MainLayout>
  );
}
