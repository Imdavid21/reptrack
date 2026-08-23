import { BottomNavigation, BottomNavigationAction, Paper, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Dumbbell, TrendingUp } from 'lucide-react';

const navItems = [
  { path: '/app', icon: Home, label: 'Today' },
  { path: '/app/train', icon: Dumbbell, label: 'Train' },
  { path: '/app/progress', icon: TrendingUp, label: 'Progress' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const currentValue = navItems.findIndex(item => {
    if (item.path === '/app') return currentPath === '/app';
    return currentPath === item.path || currentPath.startsWith(`${item.path}/`);
  });

  const requestNavigation = (path: string) => {
    if (path === currentPath) return;
    const request = new CustomEvent('reptrack-request-leave-session', {
      cancelable: true,
      detail: { path },
    });
    window.dispatchEvent(request);
    if (!request.defaultPrevented) navigate(path);
  };

  return (
    <Paper
      component="nav"
      aria-label="Primary navigation"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderTop: 1,
        borderColor: 'divider',
        borderRadius: '0 !important',
        bgcolor: 'background.paper',
        backgroundImage: 'none',
        pb: 'env(safe-area-inset-bottom)',
      }}
      elevation={0}
    >
      <BottomNavigation
        showLabels
        value={currentValue >= 0 ? currentValue : false}
        onChange={(_, newValue) => requestNavigation(navItems[newValue].path)}
        sx={{
          bgcolor: 'background.paper',
          height: 62,
          maxWidth: 560,
          mx: 'auto',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 64,
            minHeight: 58,
            py: 0.5,
            color: 'text.secondary',
            '&.Mui-selected': { color: 'text.primary' },
          },
          '& .MuiBottomNavigationAction-label': {
            mt: 0.25,
            fontSize: '0.75rem',
            letterSpacing: '0.01em',
            '&.Mui-selected': { fontSize: '0.75rem', fontWeight: 650 },
          },
        }}
      >
        {navItems.map((item, index) => {
          const selected = currentValue === index;
          return (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              aria-label={item.label}
              aria-current={selected ? 'page' : undefined}
              icon={
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, minHeight: 26 }}>
                  <item.icon size={21} strokeWidth={selected ? 2.25 : 1.75} />
                  <Box
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      bottom: -3,
                      width: selected ? 14 : 0,
                      height: 2,
                      borderRadius: 999,
                      bgcolor: 'text.primary',
                      transition: 'width 120ms ease',
                    }}
                  />
                </Box>
              }
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}
