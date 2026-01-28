import { BottomNavigation, BottomNavigationAction, Paper, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Dumbbell, History, Settings, Sparkles } from 'lucide-react';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Today' },
    { path: '/log', icon: Dumbbell, label: 'Workout' },
    { path: '/insights', icon: Sparkles, label: 'Insights' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const currentPath = location.pathname;
  const currentValue = navItems.findIndex(item => 
    item.path === currentPath || 
    (item.path !== '/' && currentPath.startsWith(item.path))
  );

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 50,
        borderTop: 1,
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom)',
        bgcolor: 'background.paper',
      }} 
      elevation={0}
    >
      <BottomNavigation
        value={currentValue >= 0 ? currentValue : 0}
        onChange={(_, newValue) => {
          navigate(navItems[newValue].path);
        }}
        sx={{
          bgcolor: 'background.paper',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 48,
            py: 1,
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'text.primary',
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.625rem',
            fontFamily: 'inherit',
            letterSpacing: '0.02em',
            mt: 0.5,
            '&.Mui-selected': {
              fontSize: '0.625rem',
            },
          },
        }}
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={<item.icon size={20} />}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
