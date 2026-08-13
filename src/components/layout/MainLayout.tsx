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
}

export function MainLayout({ children, showBack, backTo, hideNav = false }: MainLayoutProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: hideNav ? 2 : 'calc(80px + env(safe-area-inset-bottom))' }}>
      {showBack && (
        <Box
          component="header"
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <button
            onClick={handleBack}
            className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </Box>
      )}
      <Box component="main" sx={{ px: 2, py: 2, width: '100%', minWidth: 0, overflowX: 'hidden' }}>
        {children}
      </Box>
      {!hideNav && <BottomNav />}
    </Box>
  );
}
