import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  showBack?: boolean;
  backTo?: string;
  hideNav?: boolean;
  /** Wider analytical layouts without changing the mobile mental model. */
  wide?: boolean;
}

export function MainLayout({ children, showBack, backTo, hideNav = false, wide = false }: MainLayoutProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <Box sx={{
      minHeight: '100dvh',
      bgcolor: 'background.default',
      pt: 'env(safe-area-inset-top)',
      pb: hideNav ? 'max(16px, env(safe-area-inset-bottom))' : 'calc(60px + env(safe-area-inset-bottom))',
    }}>
      {showBack && (
        <Box component="header" sx={{ px: { xs: 2, md: 3 }, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="flex h-11 w-11 -ml-3 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </Box>
      )}
      <Box component="main" sx={{ px: { xs: 2, sm: 2.5, md: 3 }, py: { xs: 2, md: 3 }, width: '100%', minWidth: 0, overflowX: 'hidden' }}>
        <Box sx={{ width: '100%', maxWidth: wide ? 1040 : 680, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
      {!hideNav && <BottomNav />}
    </Box>
  );
}
