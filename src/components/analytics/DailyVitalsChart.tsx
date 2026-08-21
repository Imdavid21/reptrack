import { useMemo, useState } from 'react';
import { Box, Typography, Skeleton, useTheme, Chip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Scale, Moon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useDailyMetrics } from '@/hooks/useDailyMetrics';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useGoalHistory } from '@/hooks/useGoalHistory';
import { localDateKey } from '@/lib/dateKey';
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

type MetricType = 'weight' | 'sleep';

export function DailyVitalsChart() {
  const theme = useTheme();
  const { dateRange } = useDateRange();
  const { data, isLoading } = useDailyMetrics(dateRange);
  const { preferences } = useUserPreferences();
  const { resolveGoal } = useGoalHistory();

  const [activeMetric, setActiveMetric] = useState<MetricType>('weight');

  // Resolved as of the selected range's end date, not always "today" - so
  // viewing an old custom date range compares against the goal that was
  // actually active then, not whatever it's since been changed to.
  const sleepGoal = resolveGoal('sleep_goal', localDateKey(dateRange.to), preferences?.sleep_goal || 7);

  const primaryColor = theme.palette.text.primary;
  const mutedColor = theme.palette.text.secondary;

  const weightData = useMemo(() => {
    if (!data?.dataPoints) return [];
    
    return data.dataPoints
      .filter(d => {
        const date = parseISO(d.date);
        return date >= dateRange.from && date <= dateRange.to && d.bodyweight !== null && d.bodyweight > 0;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date: format(parseISO(d.date), 'MMM d'),
        value: d.bodyweight,
      }));
  }, [data, dateRange]);

  const sleepData = useMemo(() => {
    if (!data?.dataPoints) return [];
    
    return data.dataPoints
      .filter(d => d.sleep_hours !== null)
      .map(d => ({
        date: format(parseISO(d.date), 'MMM d'),
        value: d.sleep_hours,
      }));
  }, [data?.dataPoints]);

  const chartData = activeMetric === 'weight' ? weightData : sleepData;
  const hasData = chartData.length > 0;

  const weightStats = useMemo(() => {
    if (weightData.length < 2) return null;
    
    const weights = weightData.map(d => d.value as number);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    const padding = (max - min) * 0.2 || 5;
    const firstWeight = weightData[0]?.value as number;
    const lastWeight = weightData[weightData.length - 1]?.value as number;
    const change = lastWeight - firstWeight;
    
    return {
      yMin: Math.floor(min - padding),
      yMax: Math.ceil(max + padding),
      avgWeight: avg,
      firstWeight,
      lastWeight,
      change,
    };
  }, [weightData]);

  const sleepStats = useMemo(() => {
    if (sleepData.length < 2) return null;
    
    const sleeps = sleepData.map(d => d.value as number);
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
    const firstSleep = sleepData[0]?.value as number;
    const lastSleep = sleepData[sleepData.length - 1]?.value as number;
    const change = lastSleep - firstSleep;
    
    return {
      avgSleep: avg,
      firstSleep,
      lastSleep,
      change,
    };
  }, [sleepData]);

  if (isLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Scale size={14} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Daily Vitals</Typography>
        </Box>
        <Skeleton variant="rounded" height={180} />
      </MuiCard>
    );
  }

  const handleMetricChange = (_: React.MouseEvent<HTMLElement>, newMetric: MetricType | null) => {
    if (newMetric !== null) {
      setActiveMetric(newMetric);
    }
  };

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
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {activeMetric === 'weight' ? (
            <>Weight: <strong>{payload[0].value} kg</strong></>
          ) : (
            <>Sleep: <strong>{payload[0].value}h</strong></>
          )}
        </Typography>
      </Box>
    );
  };

  const getYDomain = (): [number, number] => {
    if (activeMetric === 'weight' && weightStats) {
      return [weightStats.yMin, weightStats.yMax];
    }
    return [0, 12]; // Sleep domain
  };

  const getReferenceLine = () => {
    if (activeMetric === 'weight' && weightStats?.avgWeight) {
      return weightStats.avgWeight;
    }
    if (activeMetric === 'sleep') {
      return sleepGoal;
    }
    return undefined;
  };

  const currentStats = activeMetric === 'weight' ? weightStats : sleepStats;
  const change = currentStats ? (activeMetric === 'weight' ? weightStats?.change : sleepStats?.change) : 0;
  const TrendIcon = (change ?? 0) > 0.5 ? TrendingUp : (change ?? 0) < -0.5 ? TrendingDown : Minus;

  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: 'action.hover',
          }}>
            {activeMetric === 'weight' ? <Scale size={14} /> : <Moon size={14} />}
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Daily Vitals</Typography>
        </Box>
        
        <ToggleButtonGroup
          value={activeMetric}
          exclusive
          onChange={handleMetricChange}
          size="small"
          sx={{
            height: 28,
            '& .MuiToggleButton-root': {
              px: 1.5,
              py: 0.5,
              fontSize: '0.75rem',
              fontWeight: 600,
              borderColor: 'divider',
              '&.Mui-selected': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
            },
          }}
        >
          <ToggleButton value="weight">
            <Scale size={12} style={{ marginRight: 4 }} />
            Weight
          </ToggleButton>
          <ToggleButton value="sleep">
            <Moon size={12} style={{ marginRight: 4 }} />
            Sleep
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {!hasData ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          No {activeMetric} data yet. Log your {activeMetric} to see trends!
        </Typography>
      ) : (
        <>
          <Box sx={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: mutedColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={getYDomain()}
                  tick={{ fill: mutedColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                {getReferenceLine() && (
                  <ReferenceLine
                    y={getReferenceLine()}
                    stroke={mutedColor}
                    strokeDasharray="4 4"
                  />
                )}
                <Tooltip content={renderTooltip} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={activeMetric === 'sleep' ? 'hsl(var(--recover))' : primaryColor}
                  strokeWidth={2}
                  fill={activeMetric === 'sleep'
                    ? 'hsl(var(--recover) / 0.12)'
                    : theme.palette.action.hover}
                  dot={{ r: 3, fill: activeMetric === 'sleep' ? 'hsl(var(--recover))' : primaryColor }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>

          {/* Stats Footer */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            {activeMetric === 'weight' && weightStats ? (
              <>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {weightStats.firstWeight} kg
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Start</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {weightStats.lastWeight} kg
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Current</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <TrendIcon size={12} />
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {weightStats.change >= 0 ? '+' : ''}{weightStats.change.toFixed(1)} kg
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Change</Typography>
                </Box>
              </>
            ) : sleepStats ? (
              <>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {sleepStats.avgSleep.toFixed(1)}h
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Average</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {sleepGoal}h
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Goal</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 700, 
                      fontSize: '0.95rem',
                      color: sleepStats.avgSleep >= sleepGoal ? 'success.main' : 'warning.main',
                    }}
                  >
                    {sleepStats.avgSleep >= sleepGoal ? '✓' : `${(sleepGoal - sleepStats.avgSleep).toFixed(1)}h short`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Status</Typography>
                </Box>
              </>
            ) : null}
          </Box>
        </>
      )}
    </MuiCard>
  );
}
