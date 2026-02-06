import { useState } from 'react';
import { Box, Typography, Skeleton, Chip, Collapse, useTheme, IconButton } from '@mui/material';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Moon, Scale, Calendar, Zap, Sparkles, ChevronDown, ChevronUp, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useMLInsights } from '@/hooks/useMLInsights';
import { useDateRange } from '@/contexts/DateRangeContext';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';

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
  const { insights, isLoading, isGenerating, hasData, aiError, generateAIInsights, isAIPowered } = useMLInsights(dateRange);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    haptic('light');
    setHasGenerated(true);
    setIsExpanded(true);
    await generateAIInsights();
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    try {
      await generateAIInsights();
    } catch {
      toast.error('Failed to refresh insights');
    }
  };

  if (isLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Brain size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>AI Coach</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
          <Typography variant="body2" sx={{ fontWeight: 600 }}>AI Coach</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
          Log workouts to unlock AI coaching insights.
        </Typography>
      </MuiCard>
    );
  }

  // Initial state — show generate button
  if (!hasGenerated) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
          <Box sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}>
            <Brain size={20} />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              AI Coach
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Personalized tips from the same AI that builds your routines
            </Typography>
          </Box>
          <Box
            component="button"
            onClick={handleGenerate}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 3,
              py: 1,
              bgcolor: 'text.primary',
              color: 'background.paper',
              border: 'none',
              borderRadius: 2,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.8rem',
              '&:hover': { opacity: 0.9 },
              '&:active': { transform: 'scale(0.98)' },
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={14} />
            Generate Insights
          </Box>
        </Box>
      </MuiCard>
    );
  }

  return (
    <MuiCard>
      {/* Header */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
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
          <Typography variant="body2" sx={{ fontWeight: 600 }}>AI Coach</Typography>
          {isAIPowered && (
            <Chip
              label="AI"
              size="small"
              sx={{
                height: 18,
                fontSize: '0.55rem',
                fontWeight: 700,
                bgcolor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                color: 'text.secondary',
              }}
            />
          )}
          {insights.length > 0 && !isGenerating && (
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
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {!isGenerating && (
            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{ p: 0.5, opacity: 0.5, '&:hover': { opacity: 1 } }}
            >
              <RefreshCw size={14} />
            </IconButton>
          )}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Box>
      </Box>

      <Collapse in={isExpanded}>
        {/* Generating state */}
        {isGenerating && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 4 }}>
            <Loader2 size={20} className="animate-spin" style={{ opacity: 0.5 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Analyzing your training data...
            </Typography>
          </Box>
        )}

        {/* Error state */}
        {aiError && !isGenerating && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mt: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'error.main',
            color: 'error.contrastText',
          }}>
            <AlertCircle size={14} />
            <Typography variant="caption" sx={{ flex: 1 }}>
              {aiError}
            </Typography>
          </Box>
        )}

        {/* Insights list */}
        {!isGenerating && insights.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
            {insights.map((insight, idx) => (
              <motion.div
                key={`${insight.category}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
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
                    flexShrink: 0,
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
                      flexShrink: 0,
                    }}>
                      !
                    </Box>
                  )}
                </Box>
              </motion.div>
            ))}
          </Box>
        )}

        {!isGenerating && insights.length === 0 && hasData && (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center', mt: 2 }}>
            Keep logging to build enough data for insights.
          </Typography>
        )}
      </Collapse>
    </MuiCard>
  );
}
