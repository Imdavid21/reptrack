import { useState, useMemo } from 'react';
import { alpha, Box, Typography, Skeleton, useTheme } from '@mui/material';
import { Layers } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import { haptic } from '@/lib/haptics';
import { getMuscleGroup, stripSetSuffix } from '@/lib/exerciseClassification';

interface CategoryData {
  name: string;
  volume: number;
  percentage: number;
  fill: string;
  exercises: { name: string; volume: number; percentage: number }[];
}

export function VolumeSankeyChart() {
  const theme = useTheme();
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // A single neutral scale keeps every segment visible in both themes. Includes 'other' so an exercise with no
  // muscle-group match (getMuscleGroup's fallback) still shows up somewhere
  // instead of silently vanishing from the chart while still being counted
  // in the total volume denominator - which used to pull every visible
  // slice's percentage below its true share.
  const MUSCLE_GROUP_LABELS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'other'];

  const CATEGORY_FILLS = useMemo(() => {
    const foreground = theme.palette.text.primary;
    return {
      chest: foreground,
      back: alpha(foreground, 0.86),
      shoulders: alpha(foreground, 0.74),
      arms: alpha(foreground, 0.64),
      legs: alpha(foreground, 0.54),
      core: alpha(foreground, 0.44),
    } as Record<string, string>;
  }, [theme.palette.text.primary]);

  const { categories, totalVolume, radialData } = useMemo(() => {
    if (!data?.sets || data.sets.length === 0) {
      return { categories: [], totalVolume: 0, radialData: [] };
    }

    // Aggregate volume by exercise, using getMuscleGroup for classification
    const exerciseVolumes = new Map<string, { volume: number; muscleGroup: string }>();

    data.sets.forEach(set => {
      if (!set.actual_weight || !set.actual_reps) return;

      const volume = set.actual_weight * set.actual_reps;
      const baseName = stripSetSuffix(set.exercise_name);
      const muscleGroup = getMuscleGroup(set.exercise_name);
      const existing = exerciseVolumes.get(baseName);

      if (existing) {
        existing.volume += volume;
      } else {
        exerciseVolumes.set(baseName, { volume, muscleGroup });
      }
    });

    if (exerciseVolumes.size === 0) {
      return { categories: [], totalVolume: 0, radialData: [] };
    }

    // Group by muscle group
    const categoryMap: Record<string, { volume: number; exercises: { name: string; volume: number }[] }> = {};
    MUSCLE_GROUP_LABELS.forEach(g => { categoryMap[g] = { volume: 0, exercises: [] }; });

    exerciseVolumes.forEach((exerciseData, name) => {
      const group = exerciseData.muscleGroup;
      if (!categoryMap[group]) categoryMap[group] = { volume: 0, exercises: [] };
      categoryMap[group].volume += exerciseData.volume;
      categoryMap[group].exercises.push({ name, volume: exerciseData.volume });
    });

    // Sort exercises by volume
    Object.values(categoryMap).forEach(cat => {
      cat.exercises.sort((a, b) => b.volume - a.volume);
    });

    const total = Object.values(categoryMap).reduce((s, c) => s + c.volume, 0);

    const cats: CategoryData[] = MUSCLE_GROUP_LABELS
      .filter(cat => categoryMap[cat]?.volume > 0)
      .map(cat => ({
        name: cat,
        volume: categoryMap[cat].volume,
        percentage: Math.round((categoryMap[cat].volume / total) * 100),
        fill: CATEGORY_FILLS[cat] || alpha(theme.palette.text.primary, 0.44),
        exercises: categoryMap[cat].exercises.map(ex => ({
          ...ex,
          percentage: Math.round((ex.volume / categoryMap[cat].volume) * 100),
        })),
      }))
      .sort((a, b) => b.volume - a.volume);

    // Create radial bar data
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
  }, [data?.sets, CATEGORY_FILLS, theme.palette.text.primary]);

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
    haptic('light');
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: 'action.hover',
          }}>
            <Layers size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Volume Breakdown
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {formatVolume(totalVolume)} kg
        </Typography>
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
              <Tooltip
                cursor={false}
                contentStyle={{
                  background: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 12,
                  fontSize: 12,
                  padding: '8px 10px',
                  boxShadow: theme.shadows[3],
                }}
                labelStyle={{ color: theme.palette.text.secondary, fontSize: 12 }}
                formatter={(value: number, _name, item) => {
                  const volume = Number(item?.payload?.volume || 0);
                  return [`${value}% · ${formatVolume(volume)} kg`, 'Share'];
                }}
              />
              <RadialBar
                dataKey="value"
                cornerRadius={4}
                background={{ fill: theme.palette.action.hover }}
                onClick={(chartData) => {
                  if (chartData?.name) toggleCategory(chartData.name);
                }}
                style={{ cursor: 'pointer' }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
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
                      ? theme.palette.action.selected
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
                  bgcolor: 'action.hover',
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
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {selectedData.exercises.slice(0, 5).map((ex) => (
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
                            width: 40,
                            height: 6,
                            borderRadius: 1,
                            bgcolor: 'action.hover',
                            overflow: 'hidden',
                            flexShrink: 0,
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
                            flex: 1,
                            fontSize: '0.75rem',
                            color: 'text.primary',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {ex.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                            flexShrink: 0,
                          }}
                        >
                          {formatVolume(ex.volume)}
                        </Typography>
                      </Box>
                    ))}
                    {selectedData.exercises.length > 5 && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.75rem',
                          color: 'text.disabled',
                          textAlign: 'center',
                          pt: 0.5,
                        }}
                      >
                        +{selectedData.exercises.length - 5} more exercises
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
                fontSize: '0.75rem',
                display: 'block',
              }}
            >
              Hover or tap a category
            </Typography>
          )}
        </Box>
      </Box>
    </MuiCard>
  );
}