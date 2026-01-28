import { BottomNavigation, BottomNavigationAction, Paper, Box, Badge } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Dumbbell, History, Settings, Sparkles } from 'lucide-react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useDraftWorkout } from '@/hooks/useDraftWorkout';
import { format, differenceInMinutes } from 'date-fns';
import { useState, useEffect } from 'react';
import logoInsights from '@/assets/logo-insights.png';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

// Custom icon component for insights using the logo
function InsightsIcon({ size = 20 }: { size?: number }) {
  return (
    <img 
      src={logoInsights} 
      alt="Insights" 
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain',
        filter: 'brightness(0) invert(0.3)', // Make it match text color
      }} 
    />
  );
}

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useMuiTheme();
  const isDark = theme.palette.mode === 'dark';
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
    { path: '/', icon: Home, label: 'Today', useCustomIcon: false },
    { path: '/log', icon: Dumbbell, label: durationLabel || 'Workout', useCustomIcon: false },
    { path: '/insights', icon: Sparkles, label: 'Insights', useCustomIcon: true },
    { path: '/history', icon: History, label: 'History', useCustomIcon: false },
    { path: '/settings', icon: Settings, label: 'Settings', useCustomIcon: false },
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
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'divider',
        pb: 'env(safe-area-inset-bottom)',
        bgcolor: isDark ? '#0a1f14' : 'background.paper',
      }} 
      elevation={0}
    >
      <BottomNavigation
        value={currentValue >= 0 ? currentValue : 0}
        onChange={(_, newValue) => {
          navigate(navItems[newValue].path);
        }}
        sx={{
          bgcolor: isDark ? '#0a1f14' : 'background.paper',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 48,
            py: 1,
            color: isDark ? 'rgba(255,255,255,0.5)' : 'text.secondary',
            '&.Mui-selected': {
              color: isDark ? '#95d5b2' : 'text.primary',
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
                {item.useCustomIcon ? (
                  <Sparkles size={20} />
                ) : (
                  <item.icon size={20} />
                )}
                {item.path === '/log' && isWorkoutActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -2,
                      right: -6,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: isDark ? '#95d5b2' : 'primary.main',
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
