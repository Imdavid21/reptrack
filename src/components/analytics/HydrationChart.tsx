import { useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme, Chip } from '@mui/material';
import { Droplets, Target } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useHydrationData } from '@/hooks/useHydrationData';
import { useDateRange } from '@/contexts/DateRangeContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

const DAILY_GOAL = 3.5;

export function HydrationChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { data, isLoading } = useHydrationData(dateRange);

  // High contrast black/white
  const primaryColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const lightFill = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';

  const chartData = useMemo(() => {
    if (!data?.dailyData) return [];
    return data.dailyData.map(d => ({
      ...d,
      metGoal: d.total >= DAILY_GOAL,
    }));
  }, [data?.dailyData]);

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
          label={`${DAILY_GOAL}L/day`}
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
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tick={{ fill: mutedColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine
              y={DAILY_GOAL}
              stroke={mutedColor}
              strokeDasharray="4 4"
            />
            <Tooltip content={renderTooltip} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.metGoal ? primaryColor : lightFill}
                />
              ))}
            </Bar>
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
              {data.totals.daysMetGoal}/{data.totals.daysTracked}
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
