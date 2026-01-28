import { Box, Typography, LinearProgress, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Dumbbell, 
  Moon, 
  Zap,
  Target,
} from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { MonthlySummary } from '@/hooks/useCorrelationAnalysis';

interface MonthlySummaryCardProps {
  summary: MonthlySummary;
}

export function MonthlySummaryCard({ summary }: MonthlySummaryCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const workoutChange = summary.priorMonthWorkouts !== undefined
    ? summary.workouts - summary.priorMonthWorkouts
    : null;

  const workoutChangePercent = summary.priorMonthWorkouts && summary.priorMonthWorkouts > 0
    ? Math.round(((summary.workouts - summary.priorMonthWorkouts) / summary.priorMonthWorkouts) * 100)
    : null;

  // Calculate goal progress (assume 16 workouts/month goal)
  const monthlyGoal = 16;
  const goalProgress = Math.min((summary.workouts / monthlyGoal) * 100, 100);

  const successLight = isDark ? 'rgba(149, 213, 178, 0.15)' : theme.palette.success.light;
  const errorLight = 'rgba(255, 138, 101, 0.15)';
  const accentColor = theme.palette.secondary.main;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MuiCard
        sx={{
          border: 2,
          borderColor: 'secondary.main',
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Calendar size={16} style={{ color: theme.palette.text.primary }} />
              <Typography 
                variant="body1" 
                sx={{ 
                  color: 'text.primary', 
                  fontWeight: 700,
                }}
              >
                {summary.month}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Monthly Performance Summary
            </Typography>
          </Box>
          {workoutChangePercent !== null && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              bgcolor: workoutChangePercent >= 0 ? successLight : errorLight,
              borderRadius: 2,
            }}>
              {workoutChangePercent >= 0 ? (
                <TrendingUp size={14} style={{ color: theme.palette.text.primary }} />
              ) : (
                <TrendingDown size={14} style={{ color: theme.palette.error.main }} />
              )}
              <Typography 
                variant="caption" 
                sx={{ 
                  color: workoutChangePercent >= 0 ? 'text.primary' : 'error.main',
                  fontWeight: 600,
                }}
              >
                {workoutChangePercent >= 0 ? '+' : ''}{workoutChangePercent}%
              </Typography>
            </Box>
          )}
        </Box>

        {/* Main Stats Row */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 2,
          mb: 2,
        }}>
          {/* Workouts */}
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ 
              p: 1.5, 
              bgcolor: 'background.paper', 
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              mb: 0.5,
            }}>
              <Dumbbell size={20} style={{ color: accentColor, margin: '0 auto' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {summary.workouts}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
              SESSIONS
            </Typography>
          </Box>

          {/* Volume */}
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ 
              p: 1.5, 
              bgcolor: 'background.paper', 
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              mb: 0.5,
            }}>
              <Zap size={20} style={{ color: accentColor, margin: '0 auto' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {summary.totalVolume >= 1000 
                ? `${(summary.totalVolume / 1000).toFixed(0)}k` 
                : summary.totalVolume}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
              VOLUME (kg)
            </Typography>
          </Box>

          {/* Avg Sleep */}
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ 
              p: 1.5, 
              bgcolor: 'background.paper', 
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              mb: 0.5,
            }}>
              <Moon size={20} style={{ color: accentColor, margin: '0 auto' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {summary.avgSleep ? summary.avgSleep.toFixed(1) : '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
              AVG SLEEP
            </Typography>
          </Box>
        </Box>

        {/* Goal Progress */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'background.paper', 
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Target size={14} style={{ color: theme.palette.text.primary }} />
              <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
                MONTHLY GOAL
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {summary.workouts}/{monthlyGoal} sessions
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={goalProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: goalProgress >= 100 ? 'secondary.main' : 'text.primary',
                borderRadius: 4,
              },
            }}
          />
          <Typography 
            variant="caption" 
            sx={{ 
              color: goalProgress >= 75 ? 'text.primary' : 'text.secondary',
              display: 'block',
              mt: 0.5,
              textAlign: 'right',
            }}
          >
            {goalProgress >= 100 
              ? '🎉 Goal achieved!' 
              : `${Math.round(goalProgress)}% complete`}
          </Typography>
        </Box>
      </MuiCard>
    </motion.div>
  );
}
