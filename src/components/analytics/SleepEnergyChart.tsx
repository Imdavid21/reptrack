import { useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme } from '@mui/material';
import { Moon, Zap } from 'lucide-react';
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
} from 'recharts';

export function SleepEnergyChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { data, isLoading } = useDailyMetrics(dateRange);

  // High contrast black/white colors
  const primaryColor = isDark ? '#FFFFFF' : '#000000';
  const secondaryColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  const chartData = useMemo(() => {
    if (!data?.dataPoints) return [];
    
    return data.dataPoints
      .filter(d => d.sleep_hours !== null || d.energy_level !== null)
      .map(d => ({
        date: format(parseISO(d.date), 'MMM d'),
        sleep: d.sleep_hours,
        energy: d.energy_level,
      }));
  }, [data?.dataPoints]);

  if (isLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Moon size={14} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Sleep & Energy</Typography>
        </Box>
        <Skeleton variant="rounded" height={200} />
      </MuiCard>
    );
  }

  if (chartData.length === 0) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Moon size={14} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Sleep & Energy</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          No sleep/energy data yet. Log your morning check-in!
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
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{label}</Typography>
        {payload.map((p: any) => (
          <Box key={p.dataKey} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.stroke }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {p.name}:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {p.value}{p.dataKey === 'sleep' ? 'h' : '/10'}
            </Typography>
          </Box>
        ))}
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
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Sleep & Energy</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: primaryColor }} />
            <Typography variant="caption">Sleep</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 2, bgcolor: primaryColor }} />
            <Typography variant="caption">Energy</Typography>
          </Box>
        </Box>
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
              yAxisId="left"
              domain={[0, 12]}
              tick={{ fill: mutedColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 10]}
              tick={{ fill: mutedColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              hide
            />
            <Tooltip content={renderTooltip} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="sleep"
              name="Sleep"
              stroke={primaryColor}
              strokeWidth={2}
              fill={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
              dot={{ r: 3, fill: primaryColor }}
              connectNulls
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="energy"
              name="Energy"
              stroke={secondaryColor}
              strokeWidth={2}
              strokeDasharray="4 2"
              fill="transparent"
              dot={{ r: 3, fill: secondaryColor, strokeWidth: 2, stroke: isDark ? '#000' : '#fff' }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {data?.totals && (
        <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ 
            flex: 1, 
            p: 2, 
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
            borderRadius: 2,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {data.totals.avgSleep?.toFixed(1) ?? '—'}h
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Avg Sleep
            </Typography>
          </Box>
          <Box sx={{ 
            flex: 1, 
            p: 2, 
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
            borderRadius: 2,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {data.totals.avgEnergy?.toFixed(1) ?? '—'}/10
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Avg Energy
            </Typography>
          </Box>
        </Box>
      )}
    </MuiCard>
  );
}
