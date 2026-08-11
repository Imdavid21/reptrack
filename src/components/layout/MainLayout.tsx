import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  showBack?: boolean;
  backTo?: string;
}

export function MainLayout({ children, showBack, backTo }: MainLayoutProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <Box
      className="app-shell"
      sx={{
        minHeight: '100dvh',
        position: 'relative',
        overflow: 'hidden',
        pb: 'calc(92px + env(safe-area-inset-bottom))',
      }}
    >
      <Box aria-hidden className="app-shell-glow app-shell-glow-energy" />
      <Box aria-hidden className="app-shell-glow app-shell-glow-water" />

      {showBack && (
        <Box
          component="header"
          className="app-page-header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            px: { xs: 2, sm: 3 },
            pt: 'max(env(safe-area-inset-top), 10px)',
            pb: 1,
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 1120, mx: 'auto' }}>
            <button
              onClick={handleBack}
              aria-label="Go back"
              className="pressable grid h-10 w-10 place-items-center rounded-2xl border border-foreground/10 bg-card/75 text-muted-foreground shadow-sm backdrop-blur-xl hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft size={20} />
            </button>
          </Box>
        </Box>
      )}

      <Box
        component="main"
        className="app-page"
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1120,
          mx: 'auto',
          px: { xs: 2, sm: 3, lg: 4 },
          py: { xs: 2, sm: 3 },
        }}
      >
        {children}
      </Box>

      <BottomNav />
    </Box>
  );
}
