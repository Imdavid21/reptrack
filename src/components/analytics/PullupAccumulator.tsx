import { useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme } from '@mui/material';
import { Trophy } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useDateRange } from '@/contexts/DateRangeContext';
import { format, parseISO, startOfWeek } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export function PullupAccumulator() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { data, isLoading } = useDailyMetrics(dateRange);

  // High contrast black/white
  const primaryColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const lightFill = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';

  const { chartData, totalPullups, weeklyAvg } = useMemo(() => {
    if (!data?.dataPoints) {
      return { chartData: [], totalPullups: 0, weeklyAvg: 0 };
    }

    const weeklyMap = new Map<string, { week: string; pullups: number; cumulative: number }>();
    let runningTotal = 0;

    data.dataPoints.forEach(d => {
      const weekStart = startOfWeek(parseISO(d.date), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const displayWeek = format(weekStart, 'MMM d');

      const existing = weeklyMap.get(weekKey);
      if (existing) {
        existing.pullups += d.pullups || 0;
      } else {
        weeklyMap.set(weekKey, {
          week: displayWeek,
          pullups: d.pullups || 0,
          cumulative: 0,
        });
      }
      runningTotal += d.pullups || 0;
    });

    let cumulative = 0;
    const sortedWeeks = Array.from(weeklyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, data]) => {
        cumulative += data.pullups;
        return { ...data, cumulative };
      });

    return {
      chartData: sortedWeeks,
      totalPullups: data.totals.totalPullups,
      weeklyAvg: sortedWeeks.length > 0
        ? Math.round(runningTotal / sortedWeeks.length)
        : 0,
    };
  }, [data]);

  if (isLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Trophy size={14} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Pull-ups</Typography>
        </Box>
        <Skeleton variant="rounded" height={160} />
      </MuiCard>
    );
  }

  if (chartData.length === 0 || totalPullups === 0) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Trophy size={14} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Pull-ups</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          No pull-up data yet. Log your first workout!
        </Typography>
      </MuiCard>
    );
  }

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
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Week of {label}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {payload[0].value} pull-ups
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 0.5 }}>
          Cumulative: {payload[0].payload.cumulative}
        </Typography>
      </Box>
    );
  };

  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}>
            <Trophy size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Pull-ups</Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>{totalPullups}</Typography>
      </Box>

      <Box sx={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="week"
              tick={{ fill: mutedColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: mutedColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={renderTooltip} />
            <Bar dataKey="pullups" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === chartData.length - 1 ? primaryColor : lightFill}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

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
          <Typography variant="body1" sx={{ fontWeight: 700 }}>{weeklyAvg}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Avg/Week</Typography>
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
          <Typography variant="body1" sx={{ fontWeight: 700 }}>{chartData.length}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Weeks Tracked</Typography>
        </Box>
      </Box>
    </MuiCard>
  );
}
