import { Box, Typography, LinearProgress, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, TrendingDown, Database } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { Correlation } from '@/hooks/useCorrelationAnalysis';

interface RealCorrelationCardProps {
  correlation: Correlation;
}

export function RealCorrelationCard({ correlation }: RealCorrelationCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const positiveColor = theme.palette.secondary.main;
  const negativeColor = theme.palette.error.main;
  const positiveBg = theme.palette.action.selected;
  const negativeBg = theme.palette.action.hover;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MuiCard
        sx={{
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Accent bar */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            bgcolor: correlation.positive ? positiveColor : negativeColor,
          }}
        />

        <Box sx={{ pl: 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                p: 0.75, 
                borderRadius: 1.5, 
                bgcolor: correlation.positive ? positiveBg : negativeBg,
              }}>
                {correlation.positive ? (
                  <TrendingUp size={14} style={{ color: theme.palette.text.primary }} />
                ) : (
                  <TrendingDown size={14} style={{ color: negativeColor }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {correlation.title}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Database size={10} style={{ color: theme.palette.text.secondary }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.55rem' }}>
                {correlation.dataPoints} data points
              </Typography>
            </Box>
          </Box>

          {/* Insight */}
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.5 }}>
            {correlation.insight}
          </Typography>

          {/* Strength meter */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={correlation.strength}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: correlation.positive ? positiveColor : negativeColor,
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
            <Typography 
              variant="caption" 
              sx={{ 
                color: correlation.positive ? 'text.primary' : 'error.main',
                fontWeight: 600,
                minWidth: 35,
                textAlign: 'right',
              }}
            >
              {correlation.strength}%
            </Typography>
          </Box>

          {/* Strength label */}
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary', 
              fontSize: '0.55rem',
              display: 'block',
              mt: 0.5,
            }}
          >
            Correlation strength
          </Typography>
        </Box>
      </MuiCard>
    </motion.div>
  );
}
