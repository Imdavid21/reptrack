import { BottomNavigation, BottomNavigationAction, Paper, Box } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Dumbbell, History, Settings, Sparkles } from 'lucide-react';

const MotionBox = motion.create(Box);

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const navItems = [
    { path: '/app', icon: Home, label: 'Today' },
    { path: '/app/log', icon: Dumbbell, label: 'Workout' },
    { path: '/app/insights', icon: Sparkles, label: 'Insights' },
    { path: '/app/history', icon: History, label: 'History' },
    { path: '/app/settings', icon: Settings, label: 'Settings' },
  ];

  const currentPath = location.pathname;
  const currentValue = navItems.findIndex(item =>
    item.path === currentPath ||
    (item.path !== '/app' && currentPath.startsWith(item.path))
  );
  const selectedValue = currentValue >= 0 ? currentValue : 0;

  return (
    <Paper
      component="nav"
      aria-label="Primary navigation"
      className="app-tab-bar"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        px: { xs: 1, sm: 2 },
        pb: 'max(env(safe-area-inset-bottom), 6px)',
        bgcolor: 'transparent',
      }}
      elevation={0}
    >
      <BottomNavigation
        showLabels
        value={selectedValue}
        onChange={(_, newValue) => navigate(navItems[newValue].path)}
        sx={{
          position: 'relative',
          isolation: 'isolate',
          maxWidth: 560,
          mx: 'auto',
          height: 62,
          px: 0.5,
          borderRadius: '20px',
          bgcolor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            position: 'relative',
            zIndex: 1,
            minWidth: 48,
            minHeight: 56,
            py: 0.75,
            borderRadius: '16px',
            color: 'text.secondary',
            WebkitTapHighlightColor: 'transparent',
            transition: reduceMotion ? 'none' : 'color 160ms ease',
            '&:active': {
              transform: reduceMotion ? 'none' : 'scale(0.96)',
            },
            '&:focus-visible': {
              outline: '2px solid hsl(var(--ring))',
              outlineOffset: -3,
            },
            '&.Mui-selected': {
              color: 'hsl(var(--foreground))',
            },
          },
          '& .MuiBottomNavigationAction-label': {
            mt: 0.35,
            fontFamily: 'inherit',
            fontSize: '0.625rem',
            lineHeight: 1.2,
            letterSpacing: '0.01em',
            '&.Mui-selected': {
              fontSize: '0.625rem',
              fontWeight: 700,
            },
          },
        }}
      >
        {navItems.map((item, idx) => {
          const selected = selectedValue === idx;
          return (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              aria-label={item.label}
              aria-current={selected ? 'page' : undefined}
              icon={
                <Box
                  sx={{
                    position: 'relative',
                    width: 42,
                    height: 28,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {selected && (
                    <MotionBox
                      layoutId="active-tab-material"
                      aria-hidden
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 500, damping: 38, mass: 0.7 }
                      }
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: -1,
                        borderRadius: '14px',
                        bgcolor: 'hsl(var(--energy-soft))',
                        boxShadow: 'inset 0 1px 0 hsl(var(--foreground) / 0.08)',
                      }}
                    />
                  )}
                  <item.icon size={20} strokeWidth={selected ? 2.35 : 1.9} />
                </Box>
              }
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}
