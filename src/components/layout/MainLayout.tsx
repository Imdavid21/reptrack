import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  hideHeader?: boolean;
}

export function MainLayout({ children, title, hideHeader }: MainLayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
      {/* Header removed - branding is handled elsewhere */}
      <Box component="main" sx={{ px: 2, py: 2 }}>
        {children}
      </Box>
      <BottomNav />
    </Box>
  );
}
