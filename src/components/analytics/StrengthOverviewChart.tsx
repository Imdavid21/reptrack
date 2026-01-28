import { useState, useMemo } from 'react';
import { Box, Typography, Chip, Skeleton, useTheme } from '@mui/material';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { format, parseISO, startOfWeek, isWithinInterval } from 'date-fns';

// Grayscale palette for exercises
const EXERCISE_COLORS = [
  { stroke: 'hsl(0 0% 25%)', fill: 'hsl(0 0% 25% / 0.6)' },
  { stroke: 'hsl(0 0% 40%)', fill: 'hsl(0 0% 40% / 0.6)' },
  { stroke: 'hsl(0 0% 55%)', fill: 'hsl(0 0% 55% / 0.6)' },
  { stroke: 'hsl(0 0% 70%)', fill: 'hsl(0 0% 70% / 0.6)' },
  { stroke: 'hsl(0 0% 80%)', fill: 'hsl(0 0% 80% / 0.6)' },
  { stroke: 'hsl(0 0% 90%)', fill: 'hsl(0 0% 90% / 0.6)' },
];

export function StrengthOverviewChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets();
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());

  // Process data: get max weight per exercise per week
  const { chartData, availableExercises, currentStrength, growth } = useMemo(() => {
    if (!data?.sets) return { chartData: [], availableExercises: [], currentStrength: 0, growth: 0 };

    // Filter by date range
    const filteredSets = data.sets.filter(set => {
      if (!set.workout_date) return false;
      const date = parseISO(set.workout_date);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });

    // Group by week and exercise
    const weeklyData = new Map<string, Map<string, number>>();
    const exerciseSet = new Set<string>();

    filteredSets.forEach(set => {
      if (!set.workout_date || !set.actual_weight) return;

      const weekStart = startOfWeek(parseISO(set.workout_date), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, new Map());
      }

      const exerciseMap = weeklyData.get(weekKey)!;
      const currentMax = exerciseMap.get(set.exercise_name) || 0;
      exerciseMap.set(set.exercise_name, Math.max(currentMax, set.actual_weight));
      exerciseSet.add(set.exercise_name);
    });

    const exercises = Array.from(exerciseSet).sort();

    // Build chart data
    const sorted = Array.from(weeklyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const chart = sorted.map(([weekKey, exerciseMap]) => {
      const point: Record<string, string | number> = {
        week: format(parseISO(weekKey), 'MMM d'),
        weekKey,
      };

      let total = 0;
      exercises.forEach(ex => {
        const weight = exerciseMap.get(ex) || 0;
        point[ex] = weight;
        total += weight;
      });
      point.total = total;

      return point;
    });

    // Calculate growth
    const firstTotal = (chart[0]?.total as number) || 0;
    const lastTotal = (chart[chart.length - 1]?.total as number) || 0;
    const growthPct = firstTotal > 0 ? Math.round(((lastTotal - firstTotal) / firstTotal) * 100) : 0;

    return {
      chartData: chart,
      availableExercises: exercises,
      currentStrength: lastTotal,
      growth: growthPct,
    };
  }, [data?.sets, dateRange]);

  // Active exercises (default to top 5 by most recent week's weight)
  const activeExercises = useMemo(() => {
    if (selectedExercises.size > 0) return selectedExercises;
    if (availableExercises.length === 0) return new Set<string>();

    // Get top 5 exercises by weight in most recent week
    const lastWeek = chartData[chartData.length - 1];
    if (!lastWeek) return new Set(availableExercises.slice(0, 5));

    const sorted = availableExercises
      .map(ex => ({ name: ex, weight: (lastWeek[ex] as number) || 0 }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map(e => e.name);

    return new Set(sorted);
  }, [selectedExercises, availableExercises, chartData]);

  const getExerciseColor = (exerciseName: string) => {
    const activeList = Array.from(activeExercises);
    const index = activeList.indexOf(exerciseName);
    if (isDark) {
      // Invert for dark mode
      const darkColors = [
        { stroke: 'hsl(0 0% 85%)', fill: 'hsl(0 0% 85% / 0.5)' },
        { stroke: 'hsl(0 0% 70%)', fill: 'hsl(0 0% 70% / 0.5)' },
        { stroke: 'hsl(0 0% 55%)', fill: 'hsl(0 0% 55% / 0.5)' },
        { stroke: 'hsl(0 0% 45%)', fill: 'hsl(0 0% 45% / 0.5)' },
        { stroke: 'hsl(0 0% 35%)', fill: 'hsl(0 0% 35% / 0.5)' },
        { stroke: 'hsl(0 0% 25%)', fill: 'hsl(0 0% 25% / 0.5)' },
      ];
      return darkColors[index % darkColors.length];
    }
    return EXERCISE_COLORS[index % EXERCISE_COLORS.length];
  };

  const toggleExercise = (exerciseName: string) => {
    setSelectedExercises(prev => {
      const next = new Set(prev.size === 0 ? Array.from(activeExercises) : prev);
      if (next.has(exerciseName)) {
        next.delete(exerciseName);
      } else {
        next.add(exerciseName);
      }
      return next;
    });
  };

  // Recalculate totals based on selected exercises
  const filteredChartData = useMemo(() => {
    return chartData.map(point => {
      let filteredTotal = 0;
      activeExercises.forEach(ex => {
        filteredTotal += (point[ex] as number) || 0;
      });
      return { ...point, filteredTotal };
    });
  }, [chartData, activeExercises]);

  const filteredCurrentStrength = filteredChartData[filteredChartData.length - 1]?.filteredTotal || 0;

  if (isLoading) {
    return (
      <MuiCard>
        <Skeleton variant="text" width={200} height={24} />
        <Skeleton variant="rounded" height={280} sx={{ mt: 2 }} />
      </MuiCard>
    );
  }

  if (chartData.length === 0) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'success.light' }}>
            <Trophy size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Strength Overview
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          Log workouts with weights to see strength progression
        </Typography>
      </MuiCard>
    );
  }

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const totalEntry = payload.find((p: any) => p.dataKey === 'filteredTotal');
    const exerciseEntries = payload.filter((p: any) => p.dataKey !== 'filteredTotal');

    return (
      <Box sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 2,
        border: 1,
        borderColor: 'divider',
        p: 1.5,
        minWidth: 140,
      }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{label}</Typography>
        {exerciseEntries.map((entry: any) => (
          <Box key={entry.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.stroke }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1 }}>
              {entry.dataKey}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {entry.value}kg
            </Typography>
          </Box>
        ))}
        {totalEntry && (
          <Box sx={{ borderTop: 1, borderColor: 'divider', mt: 1, pt: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Total: {totalEntry.value}kg
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <MuiCard>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'success.light' }}>
            <Trophy size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Strength Overview
          </Typography>
        </Box>
        {growth !== 0 && (
          <Chip
            size="small"
            icon={growth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            label={`${growth > 0 ? '+' : ''}${growth}%`}
            sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: growth > 0 ? 'action.selected' : 'action.hover',
              color: growth > 0 ? 'text.primary' : 'error.main',
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        )}
      </Box>

      {/* Exercise toggles */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, maxHeight: 80, overflowY: 'auto' }}>
        {availableExercises.map((name) => {
          const isActive = activeExercises.has(name);
          const color = isActive ? getExerciseColor(name) : null;
          return (
            <Chip
              key={name}
              label={name}
              size="small"
              onClick={() => toggleExercise(name)}
              icon={isActive ? (
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color?.stroke, ml: 0.5 }} />
              ) : undefined}
              sx={{
                fontSize: '0.65rem',
                height: 26,
                bgcolor: isActive ? 'background.paper' : 'action.hover',
                border: 1,
                borderColor: isActive ? 'divider' : 'transparent',
                color: isActive ? 'text.primary' : 'text.secondary',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.selected' },
              }}
            />
          );
        })}
      </Box>

      {/* Chart */}
      {filteredChartData.length > 1 ? (
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <defs>
                {Array.from(activeExercises).map((ex, i) => {
                  const color = getExerciseColor(ex);
                  return (
                    <linearGradient key={ex} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color.stroke} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={color.stroke} stopOpacity={0.05} />
                    </linearGradient>
                  );
                })}
              </defs>
              <XAxis
                dataKey="week"
                tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: theme.palette.text.secondary, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={renderTooltip} />
              
              {/* Stacked areas for each exercise */}
              {Array.from(activeExercises).map((ex, i) => {
                const color = getExerciseColor(ex);
                return (
                  <Area
                    key={ex}
                    type="monotone"
                    dataKey={ex}
                    stackId="1"
                    stroke={color.stroke}
                    strokeWidth={1}
                    fill={`url(#gradient-${i})`}
                  />
                );
              })}

              {/* Total line overlay */}
              <Line
                type="monotone"
                dataKey="filteredTotal"
                stroke={theme.palette.text.primary}
                strokeWidth={2}
                dot={{ fill: theme.palette.text.primary, strokeWidth: 0, r: 3 }}
                activeDot={{ fill: theme.palette.primary.main, strokeWidth: 0, r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          Log more workouts to see progression
        </Typography>
      )}

      {/* Current strength index */}
      {filteredCurrentStrength > 0 && (
        <Box sx={{
          mt: 2,
          p: 2,
          bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'grey.100',
          borderRadius: 2,
          textAlign: 'center',
        }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {filteredCurrentStrength.toLocaleString()} kg
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.05em' }}>
            STRENGTH INDEX
          </Typography>
        </Box>
      )}

      {/* Legend */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        {Array.from(activeExercises).map(ex => {
          const color = getExerciseColor(ex);
          return (
            <Box key={ex} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color.stroke }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                {ex}
              </Typography>
            </Box>
          );
        })}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 16, height: 2, bgcolor: 'text.primary', borderRadius: 1 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
            Total
          </Typography>
        </Box>
      </Box>
    </MuiCard>
  );
}
