import { ReactNode } from 'react';
import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  hideHeader?: boolean;
}

export function MainLayout({ children, title, hideHeader }: MainLayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa', pb: 10 }}>
      {!hideHeader && (
        <AppBar 
          position="sticky" 
          elevation={0}
          sx={{ 
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ minHeight: 56 }}>
            <Typography 
              variant="body2" 
              fontWeight={700} 
              letterSpacing="0.1em"
              color="text.primary"
            >
              {title || 'HEALTH/OS'}
            </Typography>
          </Toolbar>
        </AppBar>
      )}
      <Box component="main" sx={{ px: 2, py: 2 }}>
        {children}
      </Box>
      <BottomNav />
    </Box>
  );
}
