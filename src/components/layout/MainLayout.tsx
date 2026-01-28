import { ReactNode } from 'react';
import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { FloatingNav } from './FloatingNav';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  hideHeader?: boolean;
  hideNav?: boolean;
}

export function MainLayout({ children, title, hideHeader, hideNav }: MainLayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 12 }}>
      {!hideHeader && (
        <AppBar 
          position="sticky" 
          elevation={0}
          sx={{ 
            bgcolor: 'transparent',
            backdropFilter: 'blur(20px)',
            borderBottom: 1,
            borderColor: 'divider',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              bgcolor: 'background.paper',
              opacity: 0.8,
              zIndex: -1,
            },
          }}
        >
          <Toolbar sx={{ minHeight: 56 }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Typography 
                variant="body2" 
                fontWeight={700} 
                letterSpacing="0.15em"
                color="text.primary"
                sx={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                {title || 'HEALTH/OS'}
              </Typography>
            </motion.div>
          </Toolbar>
        </AppBar>
      )}
      <Box component="main" sx={{ px: 2, py: 2 }}>
        {children}
      </Box>
      {!hideNav && <FloatingNav />}
    </Box>
  );
}