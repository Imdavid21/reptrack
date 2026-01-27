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
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MuiCard
        sx={{
          bgcolor: '#f8f9fa',
          border: '1px solid #e9ecef',
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
            bgcolor: correlation.positive ? '#95d5b2' : '#ff8a65',
          }}
        />

        <Box sx={{ pl: 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ 
                p: 0.75, 
                borderRadius: 1.5, 
                bgcolor: correlation.positive ? '#d8f3dc' : 'rgba(255, 138, 101, 0.15)',
              }}>
                {correlation.positive ? (
                  <TrendingUp size={14} style={{ color: '#081c15' }} />
                ) : (
                  <TrendingDown size={14} style={{ color: '#ff8a65' }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>
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
                  bgcolor: '#e9ecef',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: correlation.positive ? '#95d5b2' : '#ff8a65',
                    borderRadius: 3,
                  },
                }}
              />
            </Box>
            <Typography 
              variant="caption" 
              sx={{ 
                color: correlation.positive ? '#081c15' : '#ff8a65',
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
