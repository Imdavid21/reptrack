import { BottomNavigation, BottomNavigationAction, Paper, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Dumbbell, History, TrendingUp } from 'lucide-react';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/app', icon: Home, label: 'Today' },
    { path: '/app/log', icon: Dumbbell, label: 'Train' },
    { path: '/app/history', icon: History, label: 'History' },
    { path: '/app/insights', icon: TrendingUp, label: 'Trends' },
  ];

  const currentPath = location.pathname;
  const currentValue = navItems.findIndex(item =>
    item.path === currentPath ||
    (item.path !== '/app' && currentPath.startsWith(item.path))
  );
  const requestNavigation = (path: string) => {
    if (path === currentPath) return;
    const request = new CustomEvent('reptrack-request-leave-session', { cancelable: true });
    window.dispatchEvent(request);
    if (!request.defaultPrevented) navigate(path);
  };

  return (
    <Paper 
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
      }} 
      elevation={0}
    >
      <BottomNavigation
        showLabels
        value={currentValue >= 0 ? currentValue : 0}
        onChange={(_, newValue) => {
          requestNavigation(navItems[newValue].path);
        }}
        sx={{
          bgcolor: 'background.paper',
          height: 58,
          minHeight: 58,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 48,
            py: 0.5,
            transform: 'translateY(3px)',
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'hsl(var(--foreground))',
            },
            // Accent dot above the active tab's icon
            '&.Mui-selected .nav-dot': {
              opacity: 1,
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.625rem',
            fontFamily: 'inherit',
            letterSpacing: '0.02em',
            mt: 0.25,
            '&.Mui-selected': {
              fontSize: '0.625rem',
              fontWeight: 700,
            },
          },
        }}
      >
        {navItems.map((item, idx) => {
          const selected = (currentValue >= 0 ? currentValue : 0) === idx;
          return (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              aria-label={item.label}
              aria-current={selected ? 'page' : undefined}
              icon={
                <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box
                    className="nav-dot"
                    sx={{
                      position: 'absolute',
                      top: -4,
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: 'hsl(var(--energy))',
                      opacity: 0,
                      transition: 'opacity 0.15s ease',
                    }}
                  />
                  <item.icon size={19} />
                </Box>
              }
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}
