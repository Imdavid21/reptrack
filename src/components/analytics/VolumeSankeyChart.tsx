import { useState, useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme, Chip } from '@mui/material';
import { Layers, TrendingUp } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';

interface CategoryData {
  name: string;
  volume: number;
  percentage: number;
  fill: string;
  exercises: { name: string; volume: number; percentage: number }[];
}

export function VolumeSankeyChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Solid dark colors - no gradients
  const CATEGORY_FILLS = useMemo(() => ({
    push: isDark ? 'hsl(0, 0%, 85%)' : 'hsl(0, 0%, 15%)',
    pull: isDark ? 'hsl(0, 0%, 65%)' : 'hsl(0, 0%, 35%)',
    legs: isDark ? 'hsl(0, 0%, 45%)' : 'hsl(0, 0%, 55%)',
  }), [isDark]);

  const { categories, totalVolume, radialData } = useMemo(() => {
    if (!data?.sets || data.sets.length === 0) {
      return { categories: [], totalVolume: 0, radialData: [] };
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
      return { categories: [], totalVolume: 0, radialData: [] };
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
        fill: CATEGORY_FILLS[cat as keyof typeof CATEGORY_FILLS],
        exercises: categoryMap[cat].exercises.map(ex => ({
          ...ex,
          percentage: Math.round((ex.volume / categoryMap[cat].volume) * 100),
        })),
      }))
      .sort((a, b) => b.volume - a.volume);

    // Create radial bar data - larger categories on outer rings
    const radial = cats.map((cat, index) => ({
      name: cat.name.charAt(0).toUpperCase() + cat.name.slice(1),
      value: cat.percentage,
      fill: cat.fill,
      volume: cat.volume,
      exercises: cat.exercises,
      innerRadius: 30 + (cats.length - 1 - index) * 25,
      outerRadius: 50 + (cats.length - 1 - index) * 25,
    }));

    return { categories: cats, totalVolume: total, radialData: radial };
  }, [data?.sets, CATEGORY_FILLS]);

  const formatVolume = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString();
  };

  const selectedData = useMemo(() => {
    if (!selectedCategory) return null;
    return categories.find(c => c.name.toLowerCase() === selectedCategory.toLowerCase());
  }, [selectedCategory, categories]);

  const toggleCategory = (name: string) => {
    setSelectedCategory(prev => prev === name ? null : name);
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
        <Skeleton variant="circular" width={200} height={200} sx={{ mx: 'auto' }} />
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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

      {/* Chart and Details Container */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Radial Chart */}
        <Box 
          sx={{ width: 180, height: 180, flexShrink: 0, position: 'relative' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="25%" 
              outerRadius="100%" 
              data={radialData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={4}
                background={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                onClick={(data) => {
                  if (data?.name) toggleCategory(data.name);
                }}
                style={{ cursor: 'pointer' }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          
          {/* Center Total */}
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
            width: 70,
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700, 
                lineHeight: 1,
                color: 'text.primary',
              }}
            >
              {formatVolume(totalVolume)}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary', 
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              kg total
            </Typography>
          </Box>
        </Box>

        {/* Legend & Hover Details */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Category Legend */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
            {categories.map((cat) => (
              <motion.div
                key={cat.name}
                onClick={() => toggleCategory(cat.name)}
                whileTap={{ scale: 0.98 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.5,
                    px: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: selectedCategory === cat.name 
                      ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')
                      : 'transparent',
                    border: 1,
                    borderColor: selectedCategory === cat.name ? 'divider' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: cat.fill,
                    }}
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      flex: 1, 
                      textTransform: 'capitalize',
                      fontWeight: selectedCategory === cat.name ? 600 : 400,
                    }}
                  >
                    {cat.name}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 600,
                      color: 'text.secondary',
                    }}
                  >
                    {cat.percentage}%
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </Box>

          {/* Exercise Breakdown on Select */}
          <AnimatePresence mode="wait">
            {selectedData && (
              <motion.div
                key={selectedData.name}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                  border: 1,
                  borderColor: 'divider',
                }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 600, 
                      textTransform: 'capitalize',
                      mb: 1,
                      display: 'block',
                    }}
                  >
                    {selectedData.name} Exercises
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {selectedData.exercises.slice(0, 4).map((ex) => (
                      <Box 
                        key={ex.name}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Box 
                          sx={{ 
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            overflow: 'hidden',
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${ex.percentage}%` }}
                            transition={{ duration: 0.3 }}
                            style={{
                              height: '100%',
                              backgroundColor: selectedData.fill,
                            }}
                          />
                        </Box>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.6rem',
                            color: 'text.secondary',
                            minWidth: 50,
                            textAlign: 'right',
                          }}
                        >
                          {ex.name.length > 12 ? ex.name.slice(0, 12) + '...' : ex.name}
                        </Typography>
                      </Box>
                    ))}
                    {selectedData.exercises.length > 4 && (
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: '0.55rem',
                          color: 'text.disabled',
                          textAlign: 'right',
                        }}
                      >
                        +{selectedData.exercises.length - 4} more
                      </Typography>
                    )}
                  </Box>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          {!selectedData && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.disabled',
                fontSize: '0.6rem',
                display: 'block',
              }}
            >
              Tap a category to see exercises
            </Typography>
          )}
        </Box>
      </Box>
    </MuiCard>
  );
}
