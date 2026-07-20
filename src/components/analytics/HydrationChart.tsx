import { useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme, Chip } from '@mui/material';
import { Droplets, Target } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useHydrationData } from '@/hooks/useHydrationData';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useGoalHistory } from '@/hooks/useGoalHistory';
import { useDateRange } from '@/contexts/DateRangeContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export function HydrationChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { preferences } = useUserPreferences();
  const { resolveGoal } = useGoalHistory();
  const dailyGoal = preferences?.daily_water_goal ?? 3;
  const { data, isLoading } = useHydrationData(dateRange);

  // High contrast black/white
  const primaryColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';


  // Each day is judged against the goal that was actually active on it (via
  // goal_history), not today's live value — see MacroChart for the same
  // pattern. The header chip and reference line still show the current goal.
  const chartData = useMemo(() => {
    if (!data?.dailyData) return [];
    return data.dailyData.map(d => {
      const target = resolveGoal('daily_water_goal', d.date, dailyGoal);
      return { ...d, target, metGoal: d.total >= target };
    });
  }, [data?.dailyData, dailyGoal, resolveGoal]);

  const daysMetGoal = useMemo(
    () => chartData.filter(d => d.total > 0 && d.metGoal).length,
    [chartData],
  );

  // Adaptive Y ceiling so high-volume days (athletes drinking >5L) aren't
  // silently clipped off the top of a hard-coded [0,5] axis.
  const yMax = useMemo(() => {
    const peak = Math.max(dailyGoal, ...chartData.map(d => d.total || 0), 0);
    return Math.max(5, Math.ceil(peak));
  }, [chartData, dailyGoal]);
  const yTicks = useMemo(
    () => Array.from({ length: yMax + 1 }, (_, i) => i),
    [yMax],
  );

  if (isLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Droplets size={14} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Hydration</Typography>
        </Box>
        <Skeleton variant="rounded" height={180} />
      </MuiCard>
    );
  }

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    
    return (
      <Box sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 2,
        border: 1,
        borderColor: 'divider',
        p: 1.5,
      }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {d.total.toFixed(2)}L ({d.logs} logs)
        </Typography>
        {d.metGoal && (
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 0.5 }}>
            ✓ Goal met!
          </Typography>
        )}
      </Box>
    );
  };

  const hasData = chartData.some(d => d.total > 0);

  if (!hasData) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Droplets size={14} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Hydration</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          No hydration data yet. Start logging water!
        </Typography>
      </MuiCard>
    );
  }

  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}>
            <Droplets size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Hydration</Typography>
        </Box>
        <Chip
          size="small"
          icon={<Target size={12} />}
          label={`${dailyGoal}L/day`}
          sx={{
            height: 24,
            fontSize: '0.7rem',
            fontWeight: 600,
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Box>

      <Box sx={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="displayDate"
              tick={{ fill: mutedColor, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, yMax]}
              ticks={yTicks}
              tick={{ fill: mutedColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine
              y={dailyGoal}
              stroke={mutedColor}
              strokeDasharray="4 4"
            />
            <Tooltip content={renderTooltip} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="hsl(var(--water))" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {data?.totals && (
        <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ 
            flex: 1, 
            p: 1.5, 
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
            borderRadius: 2,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
          }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {data.totals.avgDaily.toFixed(1)}L
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Avg/Day</Typography>
          </Box>
          <Box sx={{ 
            flex: 1, 
            p: 1.5, 
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
            borderRadius: 2,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
          }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {daysMetGoal}/{data.totals.daysTracked}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Goals Met</Typography>
          </Box>
          <Box sx={{ 
            flex: 1, 
            p: 1.5, 
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
            borderRadius: 2,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
          }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {data.totals.totalLiters.toFixed(1)}L
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total</Typography>
          </Box>
        </Box>
      )}
    </MuiCard>
  );
}
