import { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Collapse, Skeleton } from '@mui/material';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Loader2, AlertCircle, ChevronDown, ChevronUp, Zap, TrendingUp, Moon, Scale, Calendar } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useWorkouts } from '@/hooks/useWorkouts';
import { supabase } from '@/integrations/supabase/client';
import { haptic } from '@/lib/haptics';
import { startOfWeek, endOfWeek, differenceInDays } from 'date-fns';

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

interface Insight {
  category: string;
  priority: number;
  text: string;
}

export function WorkoutCoachCard() {
  const { workouts, isLoading: workoutsLoading } = useWorkouts();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Weekly training context
  const weekContext = useMemo(() => {
    if (!workouts || workouts.length === 0) return null;

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const thisWeekWorkouts = workouts.filter(w => {
      const d = new Date(w.date);
      return d >= weekStart && d <= weekEnd;
    });

    const trainedDays = thisWeekWorkouts.map(w => w.day_name);
    const uniqueDaysTrained = [...new Set(trainedDays)];

    // Last workout info
    const lastWorkout = workouts[0];
    const daysSinceLastWorkout = lastWorkout 
      ? differenceInDays(now, new Date(lastWorkout.date))
      : null;

    // Find which muscle groups haven't been hit this week
    const trainedGroups = new Set<string>();
    thisWeekWorkouts.forEach(w => {
      const name = w.day_name.toLowerCase();
      if (name.includes('push')) trainedGroups.add('push');
      if (name.includes('pull')) trainedGroups.add('pull');
      if (name.includes('legs') || name.includes('leg')) trainedGroups.add('legs');
      if (name.includes('upper')) { trainedGroups.add('push'); trainedGroups.add('pull'); }
      if (name.includes('lower')) trainedGroups.add('legs');
      if (name.includes('full')) { trainedGroups.add('push'); trainedGroups.add('pull'); trainedGroups.add('legs'); }
    });

    const missingGroups = ['push', 'pull', 'legs'].filter(g => !trainedGroups.has(g));

    return {
      sessionsThisWeek: thisWeekWorkouts.length,
      uniqueDaysTrained,
      lastWorkoutName: lastWorkout?.day_name,
      daysSinceLastWorkout,
      missingGroups,
      totalWorkouts: workouts.length,
    };
  }, [workouts]);

  // Build local nudge text
  const nudgeText = useMemo(() => {
    if (!weekContext) return 'Start logging to get personalized advice.';
    
    const { daysSinceLastWorkout, missingGroups, sessionsThisWeek } = weekContext;

    if (daysSinceLastWorkout !== null && daysSinceLastWorkout >= 3) {
      return `${daysSinceLastWorkout} days since your last session. Time to get back at it.`;
    }

    if (missingGroups.length > 0 && sessionsThisWeek > 0) {
      const missing = missingGroups.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(' & ');
      return `You haven't hit ${missing} this week. Consider training that today.`;
    }

    if (sessionsThisWeek === 0) {
      return 'No sessions logged this week yet. Pick a day to start strong.';
    }

    return `${sessionsThisWeek} session${sessionsThisWeek > 1 ? 's' : ''} this week. Keep the momentum.`;
  }, [weekContext]);

  const handleGenerate = useCallback(async () => {
    haptic('light');
    setHasGenerated(true);
    setIsExpanded(true);
    setIsGenerating(true);
    setAiError(null);

    try {
      // Build a workout-context-specific summary
      const exerciseProgress = workouts.slice(0, 20).map(w => ({
        day: w.day_name,
        date: w.date,
      }));

      const summary = {
        totalWorkouts: weekContext?.totalWorkouts || 0,
        daysActive: weekContext?.sessionsThisWeek || 0,
        exerciseProgress: [],
        avgSleep: null,
        supplementAdherence: {},
        pullupTotal: 0,
        volumeBreakdown: { push: 0, pull: 0, legs: 0 },
        recentSessions: exerciseProgress,
        missingGroups: weekContext?.missingGroups || [],
        daysSinceLastWorkout: weekContext?.daysSinceLastWorkout,
      };

      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { summary },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.insights && Array.isArray(data.insights)) {
        setInsights(data.insights);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.error('AI Coach error:', err);
      setAiError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setIsGenerating(false);
    }
  }, [workouts, weekContext]);

  if (workoutsLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Brain size={14} />
          <Skeleton variant="text" width={100} />
        </Box>
        <Skeleton variant="rounded" height={40} />
      </MuiCard>
    );
  }

  // Pre-generate state: show nudge + generate button
  if (!hasGenerated) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Nudge line */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <Brain size={16} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 0.25 }}>
                Coach
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.4 }}>
                {nudgeText}
              </Typography>
            </Box>
          </Box>

          {/* Generate button */}
          <Box
            component="button"
            onClick={handleGenerate}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              px: 3,
              py: 1.25,
              bgcolor: 'text.primary',
              color: 'background.paper',
              border: 'none',
              borderRadius: 2,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.75rem',
              '&:hover': { opacity: 0.9 },
              '&:active': { transform: 'scale(0.98)' },
              transition: 'all 0.15s ease',
              width: '100%',
            }}
          >
            <Sparkles size={14} />
            Get AI Advice
          </Box>
        </Box>
      </MuiCard>
    );
  }

  // Post-generate state: collapsible insights
  return (
    <MuiCard>
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Brain size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Coach</Typography>
          {insights.length > 0 && !isGenerating && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              {insights.length} tips
            </Typography>
          )}
        </Box>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </Box>

      <Collapse in={isExpanded}>
        {/* Generating state */}
        {isGenerating && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 3 }}>
            <Loader2 size={18} className="animate-spin" style={{ opacity: 0.5 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Analyzing your training...
            </Typography>
          </Box>
        )}

        {/* Error */}
        {aiError && !isGenerating && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1, mt: 2, p: 1.5,
            borderRadius: 2, bgcolor: 'error.main', color: 'error.contrastText',
          }}>
            <AlertCircle size={14} />
            <Typography variant="caption" sx={{ flex: 1 }}>{aiError}</Typography>
          </Box>
        )}

        {/* Insights list */}
        {!isGenerating && insights.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            {insights.map((insight, idx) => (
              <motion.div
                key={`${insight.category}-${idx}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <Box sx={{
                  display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5,
                  borderRadius: 2, bgcolor: 'action.hover',
                }}>
                  <Box sx={{
                    p: 0.5, borderRadius: 1, bgcolor: 'background.paper',
                    color: categoryColors[insight.category] || 'text.primary',
                    display: 'flex', alignItems: 'center', flexShrink: 0,
                  }}>
                    {categoryIcons[insight.category] || <Zap size={14} />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
                      {insight.text}
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </Box>
        )}

        {/* Regenerate */}
        {!isGenerating && hasGenerated && (
          <Box
            component="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleGenerate();
            }}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
              mt: 2, px: 2, py: 1, width: '100%',
              bgcolor: 'action.hover', border: 'none', borderRadius: 2,
              cursor: 'pointer', fontSize: '0.7rem', color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
              transition: 'color 0.15s ease',
            }}
          >
            <Sparkles size={12} />
            Refresh advice
          </Box>
        )}
      </Collapse>
    </MuiCard>
  );
}
