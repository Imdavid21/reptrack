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
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', pb: 'calc(80px + env(safe-area-inset-bottom))' }}>
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
            aria-label="Go back"
            className="h-11 w-11 -ml-2 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </Box>
      )}
      <Box component="main" sx={{ px: 2, py: 2 }}>
        {children}
      </Box>
      <BottomNav />
    </Box>
  );
}
