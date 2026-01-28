import { useState, useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme, Chip, Collapse } from '@mui/material';
import { Layers, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { motion, AnimatePresence } from 'framer-motion';

interface CategoryData {
  name: string;
  volume: number;
  percentage: number;
  exercises: { name: string; volume: number; percentage: number }[];
}

// Darker color palette - more black
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  push: { bg: 'hsl(0, 0%, 10%)', text: 'hsl(0, 0%, 95%)' },
  pull: { bg: 'hsl(0, 0%, 25%)', text: 'hsl(0, 0%, 95%)' },
  legs: { bg: 'hsl(0, 0%, 40%)', text: 'hsl(0, 0%, 100%)' },
};

const DARK_CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  push: { bg: 'hsl(0, 0%, 90%)', text: 'hsl(0, 0%, 10%)' },
  pull: { bg: 'hsl(0, 0%, 70%)', text: 'hsl(0, 0%, 10%)' },
  legs: { bg: 'hsl(0, 0%, 50%)', text: 'hsl(0, 0%, 100%)' },
};

export function VolumeSankeyChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { categories, totalVolume } = useMemo(() => {
    if (!data?.sets || data.sets.length === 0) {
      return { categories: [], totalVolume: 0 };
    }

    // Aggregate volume by exercise
    const exerciseVolumes = new Map<string, { volume: number; category: string }>();
    
    data.sets.forEach(set => {
      if (!set.actual_weight || !set.actual_reps) return;
      
      const volume = set.actual_weight * set.actual_reps;
      const existing = exerciseVolumes.get(set.exercise_name);
      
      if (existing) {
        existing.volume += volume;
      } else {
        exerciseVolumes.set(set.exercise_name, {
          volume,
          category: set.exercise_category,
        });
      }
    });

    if (exerciseVolumes.size === 0) {
      return { categories: [], totalVolume: 0 };
    }

    // Group by category
    const categoryMap: Record<string, { volume: number; exercises: { name: string; volume: number }[] }> = {
      push: { volume: 0, exercises: [] },
      pull: { volume: 0, exercises: [] },
      legs: { volume: 0, exercises: [] },
    };

    exerciseVolumes.forEach((data, name) => {
      const cat = data.category as 'push' | 'pull' | 'legs';
      categoryMap[cat].volume += data.volume;
      categoryMap[cat].exercises.push({ name, volume: data.volume });
    });

    // Sort exercises by volume
    Object.values(categoryMap).forEach(cat => {
      cat.exercises.sort((a, b) => b.volume - a.volume);
    });

    const total = categoryMap.push.volume + categoryMap.pull.volume + categoryMap.legs.volume;

    const cats: CategoryData[] = ['push', 'pull', 'legs']
      .filter(cat => categoryMap[cat].volume > 0)
      .map(cat => ({
        name: cat,
        volume: categoryMap[cat].volume,
        percentage: Math.round((categoryMap[cat].volume / total) * 100),
        exercises: categoryMap[cat].exercises.map(ex => ({
          ...ex,
          percentage: Math.round((ex.volume / categoryMap[cat].volume) * 100),
        })),
      }))
      .sort((a, b) => b.volume - a.volume);

    return { categories: cats, totalVolume: total };
  }, [data?.sets]);

  const formatVolume = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString();
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const getColors = (cat: string) => {
    const palette = isDark ? DARK_CATEGORY_COLORS : CATEGORY_COLORS;
    return palette[cat] || palette.push;
  };

  if (isLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Layers size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Volume Breakdown</Typography>
        </Box>
        <Skeleton variant="rounded" height={200} />
      </MuiCard>
    );
  }

  if (categories.length === 0) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Layers size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Volume Breakdown</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          Complete workouts with weights to see volume distribution
        </Typography>
      </MuiCard>
    );
  }

  return (
    <MuiCard>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }}>
            <Layers size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Volume Breakdown
          </Typography>
        </Box>
        <Chip
          size="small"
          icon={<TrendingUp size={12} />}
          label={`${formatVolume(totalVolume)} kg`}
          sx={{
            height: 26,
            fontSize: '0.7rem',
            fontWeight: 600,
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Box>

      {/* Total Volume Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          height: 32, 
          borderRadius: 2, 
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
        }}>
          {categories.map((cat, i) => {
            const colors = getColors(cat.name);
            return (
              <motion.div
                key={cat.name}
                initial={{ width: 0 }}
                animate={{ width: `${cat.percentage}%` }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
                style={{
                  backgroundColor: colors.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onClick={() => toggleCategory(cat.name)}
                whileHover={{ filter: 'brightness(1.1)' }}
                whileTap={{ scale: 0.99 }}
              >
                {cat.percentage > 15 && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: colors.text,
                      fontWeight: 600,
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {cat.name} {cat.percentage}%
                  </Typography>
                )}
              </motion.div>
            );
          })}
        </Box>
      </Box>

      {/* Category Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {categories.map((cat) => {
          const isExpanded = expandedCategories.has(cat.name);
          const colors = getColors(cat.name);
          
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Category Header */}
              <Box
                onClick={() => toggleCategory(cat.name)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: colors.bg,
                  color: colors.text,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateX(4px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={16} />
                </motion.div>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {cat.name}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {cat.exercises.length} exercises
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatVolume(cat.volume)} kg
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {cat.percentage}%
                  </Typography>
                </Box>
              </Box>

              {/* Expanded Exercises */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Box sx={{ pl: 4, pr: 1, pt: 1 }}>
                      {cat.exercises.map((ex, i) => (
                        <motion.div
                          key={ex.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.05 }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              py: 1,
                              borderBottom: i < cat.exercises.length - 1 ? 1 : 0,
                              borderColor: 'divider',
                            }}
                          >
                            {/* Progress bar */}
                            <Box sx={{ 
                              width: 4, 
                              height: 24, 
                              borderRadius: 1,
                              bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                              overflow: 'hidden',
                              position: 'relative',
                            }}>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${ex.percentage}%` }}
                                transition={{ duration: 0.4, delay: i * 0.05 }}
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  backgroundColor: colors.bg,
                                }}
                              />
                            </Box>
                            
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                flex: 1, 
                                fontSize: '0.75rem',
                                color: 'text.primary',
                              }}
                            >
                              {ex.name}
                            </Typography>
                            
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600,
                                color: 'text.secondary',
                                minWidth: 60,
                                textAlign: 'right',
                              }}
                            >
                              {formatVolume(ex.volume)} kg
                            </Typography>
                            
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'text.disabled',
                                minWidth: 32,
                                textAlign: 'right',
                              }}
                            >
                              {ex.percentage}%
                            </Typography>
                          </Box>
                        </motion.div>
                      ))}
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </Box>

      {/* Hint */}
      <Typography 
        variant="caption" 
        sx={{ 
          display: 'block', 
          textAlign: 'center', 
          color: 'text.disabled',
          mt: 2,
          fontSize: '0.65rem',
        }}
      >
        Click categories to expand exercise breakdown
      </Typography>
    </MuiCard>
  );
}
