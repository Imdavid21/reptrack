import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { GlobalRestTimerBar } from '@/components/workout/GlobalRestTimerBar';
import { LiveWorkoutCoachBridge } from '@/components/workout/LiveWorkoutCoachBridge';

interface MainLayoutProps {
  children: ReactNode;
  showBack?: boolean;
  backTo?: string;
  hideNav?: boolean;
  wide?: boolean;
}

export function MainLayout({ children, showBack, backTo, hideNav = false, wide = false }: MainLayoutProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        pb: hideNav ? 'max(16px, env(safe-area-inset-bottom))' : 'calc(72px + env(safe-area-inset-bottom))',
      }}
    >
      {showBack && (
        <Box component="header" sx={{ px: { xs: 2, md: 3 }, pt: 1, pb: 0 }}>
          <Box sx={{ width: '100%', maxWidth: wide ? 1120 : 760, mx: 'auto' }}>
            <button onClick={handleBack} aria-label="Go back" className="flex h-11 w-11 -ml-2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <ChevronLeft size={21} />
            </button>
          </Box>
        </Box>
      )}
      <Box component="main" sx={{ px: { xs: 2, sm: 2.5, md: 3 }, pt: showBack ? 1 : { xs: 2, md: 3 }, pb: 2, width: '100%', minWidth: 0, overflowX: 'clip' }}>
        <Box sx={{ width: '100%', maxWidth: wide ? 1120 : 760, mx: 'auto' }}>{children}</Box>
      </Box>
      <LiveWorkoutCoachBridge />
      <GlobalRestTimerBar />
      {!hideNav && <BottomNav />}
    </Box>
  );
}
