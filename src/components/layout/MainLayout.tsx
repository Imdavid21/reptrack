import { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  backTo?: string;
}

export function MainLayout({ children, title, showBack, backTo }: MainLayoutProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      {/* Header with optional back button and title */}
      {(title || showBack) && (
        <Box
          component="header"
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {showBack && (
            <button
              onClick={handleBack}
              className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {title && (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
              }}
            >
              {title}
            </Typography>
          )}
        </Box>
      )}
      <Box component="main" sx={{ px: 2, py: 2 }}>
        {children}
      </Box>
      <BottomNav />
    </Box>
  );
}
