import { BottomNavigation, BottomNavigationAction, Paper, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Dumbbell, TrendingUp } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/app', icon: Home, label: 'Today' },
  { path: '/app/train', icon: Dumbbell, label: 'Train' },
  { path: '/app/progress', icon: TrendingUp, label: 'Progress' },
] as const;

function activeNavIndex(pathname: string) {
  if (pathname === '/app' || pathname === '/app/') return 0;
  if (pathname.startsWith('/app/train') || pathname.startsWith('/app/log')) return 1;
  if (
    pathname.startsWith('/app/progress') ||
    pathname.startsWith('/app/history') ||
    pathname.startsWith('/app/insights') ||
    pathname.startsWith('/app/dataroom')
  ) return 2;
  return 0;
}

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const currentValue = activeNavIndex(currentPath);

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
      aria-label="Primary"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        m: 0,
        p: 0,
        zIndex: 50,
        borderTop: 1,
        borderColor: 'divider',
        borderRadius: '0 !important',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        pb: 'env(safe-area-inset-bottom)',
      }}
      elevation={0}
    >
      <BottomNavigation
        showLabels
        value={currentValue}
        onChange={(_, newValue) => requestNavigation(NAV_ITEMS[newValue].path)}
        sx={{
          bgcolor: 'background.paper',
          height: 60,
          minHeight: 60,
          maxWidth: 540,
          mx: 'auto',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 64,
            py: 0.5,
            minHeight: 56,
            color: 'text.secondary',
            '&.Mui-selected': { color: 'text.primary' },
            '&.Mui-selected .nav-marker': { opacity: 1, transform: 'scaleX(1)' },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.75rem',
            fontFamily: 'inherit',
            letterSpacing: '0.01em',
            mt: 0.25,
            '&.Mui-selected': { fontSize: '0.75rem', fontWeight: 700 },
          },
        }}
      >
        {NAV_ITEMS.map((item, idx) => {
          const selected = currentValue === idx;
          return (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              aria-label={item.label}
              aria-current={selected ? 'page' : undefined}
              icon={
                <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box
                    className="nav-marker"
                    sx={{
                      position: 'absolute',
                      top: -6,
                      width: 18,
                      height: 2,
                      borderRadius: 99,
                      bgcolor: 'text.primary',
                      opacity: 0,
                      transform: 'scaleX(.35)',
                      transition: 'opacity var(--duration-fast) var(--ease-interface), transform var(--duration-fast) var(--ease-interface)',
                    }}
                  />
                  <item.icon size={20} strokeWidth={selected ? 2.2 : 1.75} />
                </Box>
              }
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}
