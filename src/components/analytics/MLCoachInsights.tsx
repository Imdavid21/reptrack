import { useState } from 'react';
import { Box, Typography, Skeleton, Chip, Button, Collapse, useTheme, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Moon, Scale, Calendar, Zap, Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useMLInsights } from '@/hooks/useMLInsights';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useQueryClient } from '@tanstack/react-query';
import { haptic } from '@/lib/haptics';

const categoryIcons: Record<string, React.ReactNode> = {
  strength: <TrendingUp size={14} />,
  recovery: <Moon size={14} />,
  balance: <Scale size={14} />,
  consistency: <Calendar size={14} />,
  progress: <Zap size={14} />,
};

const categoryColors: Record<string, string> = {
  strength: 'success.main',
  recovery: 'info.main',
  balance: 'warning.main',
  consistency: 'primary.main',
  progress: 'secondary.main',
};

export function MLCoachInsights() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { insights, isLoading, hasData } = useMLInsights(dateRange);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleGenerate = () => {
    setHasGenerated(true);
    setIsExpanded(true);
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['dailyMetrics'] });
    await queryClient.invalidateQueries({ queryKey: ['exerciseSets'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (isLoading && hasGenerated) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Brain size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            AI Coach
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={48} />
        </Box>
      </MuiCard>
    );
  }

  if (!hasData) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Brain size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            AI Coach
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
          Log workouts to unlock data-driven coaching insights.
        </Typography>
      </MuiCard>
    );
  }

  // Collapsed state - show generate button
  if (!hasGenerated) {
    return (
      <MuiCard>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          gap: 2,
          py: 2,
        }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}>
            <Brain size={20} />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              AI Coach Insights
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Get personalized tips based on your data
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<Sparkles size={14} />}
            onClick={handleGenerate}
            sx={{
              bgcolor: 'text.primary',
              color: 'background.paper',
              '&:hover': {
                bgcolor: 'text.secondary',
              },
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            Generate Insights
          </Button>
        </Box>
      </MuiCard>
    );
  }

  return (
    <MuiCard>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}>
            <Brain size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            AI Coach
          </Typography>
          <Chip 
            label={`${insights.length} tips`}
            size="small" 
            sx={{ 
              height: 20, 
              fontSize: '0.6rem',
              bgcolor: 'action.hover',
              color: 'text.secondary',
            }} 
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={handleRefresh}
            sx={{ 
              p: 0.5,
              opacity: 0.5,
              '&:hover': { opacity: 1 },
            }}
          >
            <RefreshCw 
              size={14} 
              style={{ 
                transition: 'transform 0.3s ease',
                transform: isRefreshing ? 'rotate(180deg)' : 'rotate(0deg)',
              }} 
            />
          </IconButton>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Box>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
          {insights.map((insight, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Box sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                border: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }}>
                <Box sx={{ 
                  p: 0.75, 
                  borderRadius: 1.5, 
                  bgcolor: 'action.hover',
                  color: categoryColors[insight.category] || 'text.primary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {categoryIcons[insight.category] || <Zap size={14} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ 
                    fontWeight: 500,
                    lineHeight: 1.4,
                    fontSize: '0.8rem',
                  }}>
                    {insight.text}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontSize: '0.6rem',
                  }}>
                    {insight.category}
                  </Typography>
                </Box>
                {insight.priority >= 4 && (
                  <Box sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: 'error.main',
                    color: 'error.contrastText',
                    fontSize: '0.55rem',
                    fontWeight: 700,
                  }}>
                    !
                  </Box>
                )}
              </Box>
            </motion.div>
          ))}
        </Box>

        {insights.length === 0 && hasData && (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center', mt: 2 }}>
            Keep logging to build enough data for insights.
          </Typography>
        )}
      </Collapse>
    </MuiCard>
  );
}
