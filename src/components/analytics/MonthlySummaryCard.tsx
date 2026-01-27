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
  
  const workoutChange = summary.priorMonthWorkouts !== undefined
    ? summary.workouts - summary.priorMonthWorkouts
    : null;

  const workoutChangePercent = summary.priorMonthWorkouts && summary.priorMonthWorkouts > 0
    ? Math.round(((summary.workouts - summary.priorMonthWorkouts) / summary.priorMonthWorkouts) * 100)
    : null;

  // Calculate goal progress (assume 16 workouts/month goal)
  const monthlyGoal = 16;
  const goalProgress = Math.min((summary.workouts / monthlyGoal) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MuiCard
        sx={{
          bgcolor: '#f8f9fa',
          border: '2px solid #95d5b2',
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Calendar size={16} style={{ color: '#081c15' }} />
              <Typography 
                variant="body1" 
                sx={{ 
                  color: '#081c15', 
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
              bgcolor: workoutChangePercent >= 0 ? '#d8f3dc' : 'rgba(255, 138, 101, 0.15)',
              borderRadius: 2,
            }}>
              {workoutChangePercent >= 0 ? (
                <TrendingUp size={14} style={{ color: '#081c15' }} />
              ) : (
                <TrendingDown size={14} style={{ color: '#ff8a65' }} />
              )}
              <Typography 
                variant="caption" 
                sx={{ 
                  color: workoutChangePercent >= 0 ? '#081c15' : '#ff8a65',
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
              border: '1px solid #e9ecef',
              mb: 0.5,
            }}>
              <Dumbbell size={20} style={{ color: '#95d5b2', margin: '0 auto' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#081c15' }}>
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
              border: '1px solid #e9ecef',
              mb: 0.5,
            }}>
              <Zap size={20} style={{ color: '#95d5b2', margin: '0 auto' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#081c15' }}>
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
              border: '1px solid #e9ecef',
              mb: 0.5,
            }}>
              <Moon size={20} style={{ color: '#95d5b2', margin: '0 auto' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#081c15' }}>
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
          border: '1px solid #e9ecef',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Target size={14} style={{ color: '#081c15' }} />
              <Typography variant="caption" sx={{ color: '#081c15', fontWeight: 600 }}>
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
              bgcolor: '#e9ecef',
              '& .MuiLinearProgress-bar': {
                bgcolor: goalProgress >= 100 ? '#95d5b2' : '#081c15',
                borderRadius: 4,
              },
            }}
          />
          <Typography 
            variant="caption" 
            sx={{ 
              color: goalProgress >= 75 ? '#081c15' : 'text.secondary',
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
