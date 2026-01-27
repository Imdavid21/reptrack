import { BottomNavigation, BottomNavigationAction, Paper, Box, Badge } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Dumbbell, BarChart3, History, Settings } from 'lucide-react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { format, differenceInMinutes } from 'date-fns';
import { useState, useEffect } from 'react';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workouts } = useWorkouts();
  const { draft } = useDraftWorkout();
  const [elapsed, setElapsed] = useState<number | null>(null);
  
  useEffect(() => {
    if (!draft?.workoutStartTime) {
      setElapsed(null);
      return;
    }
    const updateElapsed = () => {
      const mins = differenceInMinutes(new Date(), new Date(draft.workoutStartTime!));
      setElapsed(mins > 0 ? mins : 1);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [draft?.workoutStartTime]);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayWorkout = workouts.find(w => w.date === today);
  const completedDuration = todayWorkout?.workout_duration_minutes;
  const durationLabel = elapsed ? formatDuration(elapsed) : (completedDuration ? formatDuration(completedDuration) : null);
  const isWorkoutActive = !!elapsed;

  const navItems = [
    { path: '/', icon: Home, label: 'Today' },
    { path: '/log', icon: Dumbbell, label: durationLabel || 'Workout' },
    { path: '/insights', icon: BarChart3, label: 'Insights' },
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
        {navItems.map((item, index) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={
              <Box sx={{ position: 'relative' }}>
                <item.icon size={20} />
                {item.path === '/log' && isWorkoutActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -2,
                      right: -6,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                      },
                    }}
                  />
                )}
              </Box>
            }
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
