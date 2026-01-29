import { useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme } from '@mui/material';
import { Moon } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useDateRange } from '@/contexts/DateRangeContext';
import { format, parseISO } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export function SleepChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { data, isLoading } = useDailyMetrics(dateRange);
  const { preferences } = useUserPreferences();

  const sleepGoal = preferences?.sleep_goal || 7;

  const primaryColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  const chartData = useMemo(() => {
    if (!data?.dataPoints) return [];
    
    return data.dataPoints
      .filter(d => d.sleep_hours !== null)
      .map(d => ({
        date: format(parseISO(d.date), 'MMM d'),
        sleep: d.sleep_hours,
      }));
  }, [data?.dataPoints]);

  if (isLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Moon size={14} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Sleep</Typography>
        </Box>
        <Skeleton variant="rounded" height={180} />
      </MuiCard>
    );
  }

  if (chartData.length === 0) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}>
            <Moon size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Sleep</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          No sleep data yet. Log your sleep to see trends!
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
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>{label}</Typography>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {payload[0].value}h sleep
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
            <Moon size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Sleep</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Goal: {sleepGoal}h
        </Typography>
      </Box>

      <Box sx={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: mutedColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 12]}
              tick={{ fill: mutedColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={renderTooltip} />
            <ReferenceLine 
              y={sleepGoal} 
              stroke={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} 
              strokeDasharray="4 4" 
            />
            <Area
              type="monotone"
              dataKey="sleep"
              name="Sleep"
              stroke={primaryColor}
              strokeWidth={2}
              fill={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
              dot={{ r: 3, fill: primaryColor }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {data?.totals && (
        <Box sx={{ 
          mt: 2, 
          pt: 2, 
          borderTop: 1, 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <Box sx={{ 
            p: 2, 
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
            borderRadius: 2,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
            minWidth: 120,
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {data.totals.avgSleep?.toFixed(1) ?? '—'}h
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Average Sleep
            </Typography>
          </Box>
        </Box>
      )}
    </MuiCard>
  );
}
