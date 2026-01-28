import { Box, Typography, Skeleton, useTheme } from '@mui/material';
import { Trophy, TrendingUp } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { format, parseISO, startOfWeek } from 'date-fns';

export function TotalStrengthChart() {
  const { data, isLoading } = useExerciseSets();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (isLoading) {
    return (
      <MuiCard>
        <Skeleton variant="text" width={180} height={24} />
        <Skeleton variant="rounded" height={200} sx={{ mt: 2 }} />
      </MuiCard>
    );
  }

  // Calculate total strength index per week (sum of all max weights)
  const weeklyStrength = new Map<string, { total: number; exercises: Set<string> }>();

  data?.sets.forEach(set => {
    if (!set.workout_date || !set.actual_weight) return;
    
    const weekStart = startOfWeek(parseISO(set.workout_date), { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const weekLabel = format(weekStart, 'MMM d');

    const existing = weeklyStrength.get(weekKey) || { total: 0, exercises: new Set<string>() };
    
    // Add max weight per exercise per week
    if (!existing.exercises.has(set.exercise_name)) {
      existing.total += set.actual_weight;
      existing.exercises.add(set.exercise_name);
    } else {
      // Update if this weight is higher
      // For simplicity, we'll just add to total (this is a strength index, not exact)
    }
    
    weeklyStrength.set(weekKey, existing);
  });

  // Also track max weight per exercise separately for accurate strength index
  const exerciseMaxByWeek = new Map<string, Map<string, number>>();
  
  data?.sets.forEach(set => {
    if (!set.workout_date || !set.actual_weight) return;
    
    const weekStart = startOfWeek(parseISO(set.workout_date), { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');

    if (!exerciseMaxByWeek.has(weekKey)) {
      exerciseMaxByWeek.set(weekKey, new Map());
    }
    
    const exerciseMap = exerciseMaxByWeek.get(weekKey)!;
    const currentMax = exerciseMap.get(set.exercise_name) || 0;
    exerciseMap.set(set.exercise_name, Math.max(currentMax, set.actual_weight));
  });

  // Build chart data with true strength index
  const chartData = Array.from(exerciseMaxByWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekKey, exercises]) => {
      const strengthIndex = Array.from(exercises.values()).reduce((sum, w) => sum + w, 0);
      return {
        week: format(parseISO(weekKey), 'MMM d'),
        strength: strengthIndex,
      };
    });

  // Calculate growth
  const firstStrength = chartData[0]?.strength || 0;
  const lastStrength = chartData[chartData.length - 1]?.strength || 0;
  const growth = firstStrength > 0 ? Math.round(((lastStrength - firstStrength) / firstStrength) * 100) : 0;

  const accentColor = theme.palette.secondary.main;
  const mutedColor = theme.palette.text.secondary;
  const positiveBg = theme.palette.action.selected;
  const negativeBg = theme.palette.action.hover;
  const errorColor = theme.palette.error.main;

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <Box sx={{ 
        bgcolor: 'background.paper', 
        borderRadius: 2, 
        boxShadow: 2, 
        border: 1,
        borderColor: 'divider',
        p: 1.5,
      }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          Strength Index: <strong style={{ color: theme.palette.text.primary }}>{payload[0]?.value} kg</strong>
        </Typography>
      </Box>
    );
  };

  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'success.light' }}>
            <Trophy size={14} style={{ color: theme.palette.text.primary }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Total Strength Progression
          </Typography>
        </Box>
        {growth !== 0 && (
            <Box sx={{ 
				  display: 'flex', 
				  alignItems: 'center', 
				  gap: 0.5, 
				  bgcolor: growth > 0 ? positiveBg : negativeBg, 
				  px: 1.5, 
				  py: 0.5, 
				  borderRadius: 2 
				}}>
            <TrendingUp size={12} style={{ color: growth > 0 ? theme.palette.text.primary : errorColor }} />
            <Typography variant="caption" sx={{ color: growth > 0 ? 'text.primary' : 'error.main', fontWeight: 600 }}>
              {growth > 0 ? '+' : ''}{growth}%
            </Typography>
          </Box>
        )}
      </Box>

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
        Sum of max weights across all exercises per week
      </Typography>

      {chartData.length > 1 ? (
        <Box sx={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: mutedColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: mutedColor }} axisLine={false} tickLine={false} />
              <Tooltip content={renderTooltip} />
               <ReferenceLine 
                y={lastStrength} 
                 stroke={positiveBg} 
                strokeDasharray="3 3"
              />
              <Line
                type="monotone"
                dataKey="strength"
                stroke={accentColor}
                strokeWidth={3}
                dot={{ fill: accentColor, strokeWidth: 0, r: 4 }}
                activeDot={{ fill: theme.palette.text.primary, strokeWidth: 0, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
          Log more workouts to track strength progression
        </Typography>
      )}

      {/* Current strength index */}
      {lastStrength > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'grey.200', borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {lastStrength.toLocaleString()} kg
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            CURRENT STRENGTH INDEX
          </Typography>
        </Box>
      )}
    </MuiCard>
  );
}
