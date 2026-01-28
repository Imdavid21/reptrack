import { useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme, Chip } from '@mui/material';
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useMorningCheckinHistory } from '@/hooks/useMorningCheckin';
import { useDateRange } from '@/contexts/DateRangeContext';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export function BodyweightChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const days = differenceInDays(dateRange.to, dateRange.from) + 1;
  const { data: checkins, isLoading } = useMorningCheckinHistory(days);

  // High contrast black/white
  const primaryColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  const chartData = useMemo(() => {
    if (!checkins) return [];
    
    return checkins
      .filter(c => {
        const date = parseISO(c.date);
        return date >= dateRange.from && date <= dateRange.to && c.bodyweight !== null && c.bodyweight > 0;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(c => ({
        date: format(parseISO(c.date), 'MMM d'),
        weight: c.bodyweight,
      }));
  }, [checkins, dateRange]);

  const { yMin, yMax, avgWeight } = useMemo(() => {
    if (chartData.length === 0) return { yMin: 60, yMax: 100, avgWeight: null };
    
    const weights = chartData.map(d => d.weight as number);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    const padding = (max - min) * 0.2 || 5;
    
    return {
      yMin: Math.floor(min - padding),
      yMax: Math.ceil(max + padding),
      avgWeight: avg,
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Scale size={14} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Bodyweight</Typography>
        </Box>
        <Skeleton variant="rounded" height={180} />
      </MuiCard>
    );
  }

  if (chartData.length === 0) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Scale size={14} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Bodyweight</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          No bodyweight data yet. Log your weight in morning check-in!
        </Typography>
      </MuiCard>
    );
  }

  const firstWeight = chartData[0]?.weight as number;
  const lastWeight = chartData[chartData.length - 1]?.weight as number;
  const change = lastWeight - firstWeight;
  const changePercent = ((change / firstWeight) * 100).toFixed(1);

  const TrendIcon = change > 0.5 ? TrendingUp : change < -0.5 ? TrendingDown : Minus;

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
          Weight: <strong>{payload[0].value} kg</strong>
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
            <Scale size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Bodyweight</Typography>
        </Box>
        {chartData.length >= 2 && (
          <Chip
            size="small"
            icon={<TrendIcon size={12} />}
            label={`${change >= 0 ? '+' : ''}${change.toFixed(1)} kg`}
            sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        )}
      </Box>

      <Box sx={{ height: 160 }}>
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
              domain={[yMin, yMax]}
              tick={{ fill: mutedColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            {avgWeight && (
              <ReferenceLine
                y={avgWeight}
                stroke={mutedColor}
                strokeDasharray="4 4"
              />
            )}
            <Tooltip content={renderTooltip} />
            <Area
              type="monotone"
              dataKey="weight"
              stroke={primaryColor}
              strokeWidth={2}
              fill={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
              dot={{ r: 3, fill: primaryColor }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{firstWeight} kg</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Start</Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{lastWeight} kg</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Current</Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{avgWeight?.toFixed(1)} kg</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Average</Typography>
        </Box>
      </Box>
    </MuiCard>
  );
}
