import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Dumbbell, Moon, Zap, Footprints } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { WeeklySummary } from '@/hooks/useCorrelationAnalysis';

interface WeeklySummaryCardProps {
  summary: WeeklySummary;
  isCurrentWeek?: boolean;
}

export function WeeklySummaryCard({ summary, isCurrentWeek }: WeeklySummaryCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const workoutChange = summary.priorWeekWorkouts !== undefined
    ? summary.workouts - summary.priorWeekWorkouts
    : null;
  
  const volumeChange = summary.priorWeekVolume && summary.priorWeekVolume > 0
    ? Math.round(((summary.totalVolume - summary.priorWeekVolume) / summary.priorWeekVolume) * 100)
    : null;

  const TrendIcon = ({ value }: { value: number | null }) => {
    if (value === null || value === 0) return <Minus size={12} />;
    return value > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />;
  };

  const getTrendColor = (value: number | null) => {
    if (value === null || value === 0) return theme.palette.text.secondary;
    return value > 0 ? theme.palette.secondary.main : theme.palette.error.main;
  };

  const surfaceBg = isDark ? 'rgba(255,255,255,0.05)' : 'background.default';
  const accentBorder = theme.palette.secondary.main;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MuiCard
        sx={{
          border: isCurrentWeek ? 2 : 1,
          borderColor: isCurrentWeek ? 'secondary.main' : 'divider',
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.primary', 
                fontWeight: 600,
                fontSize: '0.65rem',
              }}
            >
              {isCurrentWeek ? 'THIS WEEK' : 'WEEK'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              {summary.weekStart} - {summary.weekEnd}
            </Typography>
          </Box>
          {isCurrentWeek && (
            <Box sx={{ 
              px: 1, 
              py: 0.5, 
              bgcolor: 'success.light', 
              borderRadius: 2,
            }}>
              <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.6rem' }}>
                CURRENT
              </Typography>
            </Box>
          )}
        </Box>

        {/* Stats Grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 1.5 
        }}>
          {/* Workouts */}
          <Box sx={{ 
            p: 1.5, 
            bgcolor: surfaceBg, 
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Dumbbell size={12} style={{ color: theme.palette.text.primary }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                SESSIONS
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {summary.workouts}
              </Typography>
              {workoutChange !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', color: getTrendColor(workoutChange) }}>
                  <TrendIcon value={workoutChange} />
                  <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                    {workoutChange > 0 ? `+${workoutChange}` : workoutChange}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Volume */}
          <Box sx={{ 
            p: 1.5, 
            bgcolor: surfaceBg, 
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Zap size={12} style={{ color: theme.palette.text.primary }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                VOLUME
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {summary.totalVolume >= 1000 
                  ? `${(summary.totalVolume / 1000).toFixed(1)}k` 
                  : summary.totalVolume}
              </Typography>
              {volumeChange !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', color: getTrendColor(volumeChange) }}>
                  <TrendIcon value={volumeChange} />
                  <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                    {volumeChange > 0 ? `+${volumeChange}%` : `${volumeChange}%`}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Sleep */}
          <Box sx={{ 
            p: 1.5, 
            bgcolor: surfaceBg, 
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Moon size={12} style={{ color: theme.palette.text.primary }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                AVG SLEEP
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {summary.avgSleep ? `${summary.avgSleep.toFixed(1)}h` : '—'}
            </Typography>
          </Box>

          {/* Steps */}
          <Box sx={{ 
            p: 1.5, 
            bgcolor: surfaceBg, 
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Footprints size={12} style={{ color: theme.palette.text.primary }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                AVG STEPS
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {summary.avgSteps ? summary.avgSteps.toLocaleString() : '—'}
            </Typography>
          </Box>
        </Box>
      </MuiCard>
    </motion.div>
  );
}
