import { useState } from 'react';
import { Box, Typography, Skeleton, useTheme } from '@mui/material';
import { Zap, Clock, TrendingUp, Dumbbell } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useAutoMetrics } from '@/hooks/useAutoMetrics';
import { useDateRange } from '@/contexts/DateRangeContext';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

type ViewMode = 'volume' | 'strength';

export function EfficiencyChart() {
  const { dateRange } = useDateRange();
  const { data, isLoading } = useAutoMetrics(dateRange);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [mode, setMode] = useState<ViewMode>('volume');

  if (isLoading) {
    return (
      <MuiCard>
        <Skeleton variant="text" width={150} height={24} />
        <Skeleton variant="rounded" height={200} sx={{ mt: 2 }} />
      </MuiCard>
    );
  }

  // Strength trend uses a running best-so-far (never decreases) so the line
  // reads as genuine progress over the period, the same way a PR chart would —
  // the bar underneath still shows each day's own peak effort.
  let bestSoFar = 0;
  const chartData = data?.history.map(h => {
    bestSoFar = Math.max(bestSoFar, h.strengthIndex);
    return {
      date: format(parseISO(h.date), 'MMM d'),
      efficiency: h.efficiency,
      volume: Math.round(h.volume / 1000), // in thousands (k kg)
      duration: h.duration,
      strengthIndex: h.strengthIndex,
      bestSoFar: Math.round(bestSoFar),
    };
  }) || [];

  const totalDuration = data?.history.reduce((s, h) => s + h.duration, 0) || 0;
  const totalVolume = data?.history.reduce((s, h) => s + h.volume, 0) || 0;
  const n = data?.history.length || 0;

  // Overall efficiency must be total volume / total duration, NOT the mean of
  // per-workout efficiencies (that average-of-averages overstates the figure
  // whenever workout durations vary).
  const avgEfficiency = totalDuration > 0 ? Math.round(totalVolume / totalDuration) : 0;
  const avgDuration = n ? Math.round(totalDuration / n) : 0;
  const avgVolume = n ? Math.round(totalVolume / n) : 0;

  const strengthDays = data?.history.filter(h => h.strengthIndex > 0) || [];
  const peakStrength = strengthDays.length ? Math.max(...strengthDays.map(h => h.strengthIndex)) : 0;
  const avgStrength = strengthDays.length
    ? Math.round(strengthDays.reduce((s, h) => s + h.strengthIndex, 0) / strengthDays.length)
    : 0;

  const isVolume = mode === 'volume';

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const dataPoint = chartData.find(d => d.date === label);
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
        {isVolume ? (
          <>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Volume: <strong style={{ color: theme.palette.text.primary }}>{dataPoint?.volume}k kg</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Duration: <strong style={{ color: theme.palette.text.primary }}>{dataPoint?.duration} min</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Efficiency: <strong style={{ color: theme.palette.text.primary }}>{dataPoint?.efficiency} kg/min</strong>
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Peak est. 1RM that day: <strong style={{ color: theme.palette.text.primary }}>{dataPoint?.strengthIndex || '—'} kg</strong>
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Best so far: <strong style={{ color: theme.palette.text.primary }}>{dataPoint?.bestSoFar || '—'} kg</strong>
            </Typography>
          </>
        )}
      </Box>
    );
  };

  // High contrast black/white only
  const barColor = isDark ? '#FFFFFF' : '#000000';
  const lineColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}>
            {isVolume ? <Zap size={14} style={{ color: theme.palette.text.primary }} /> : <Dumbbell size={14} style={{ color: theme.palette.text.primary }} />}
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Workout Efficiency
          </Typography>
        </Box>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          px: 1.5,
          py: 0.5,
          borderRadius: 2
        }}>
          <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {isVolume ? `${avgEfficiency} kg/min avg` : `${peakStrength} kg peak`}
          </Typography>
        </Box>
      </Box>

      {/* Volume / Strength toggle */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
        {(['volume', 'strength'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setMode(v)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors',
              mode === v
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {v}
          </button>
        ))}
      </Box>

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
        {isVolume ? 'Volume lifted per minute in gym' : 'Estimated 1-rep max trend across your lifts'}
      </Typography>

      {chartData.length > 0 ? (
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: mutedColor }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: mutedColor }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: mutedColor }} axisLine={false} tickLine={false} hide />
              <Tooltip content={renderTooltip} />
              {isVolume ? (
                <>
                  <Bar
                    yAxisId="left"
                    dataKey="volume"
                    fill={barColor}
                    radius={[4, 4, 0, 0]}
                    name="Volume (k kg)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="efficiency"
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={false}
                    name="Efficiency"
                    unit=" kg/min"
                  />
                </>
              ) : (
                <>
                  <Bar
                    yAxisId="left"
                    dataKey="strengthIndex"
                    fill={barColor}
                    radius={[4, 4, 0, 0]}
                    name="Est. 1RM (kg)"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="bestSoFar"
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={false}
                    name="Best so far"
                    unit=" kg"
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
          Log workouts to see efficiency data
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        {isVolume ? (
          <>
            <Box sx={{ flex: 1, p: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 2, textAlign: 'center' }}>
              <Clock size={14} style={{ color: mutedColor, marginBottom: 4 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1rem' }}>
                {avgDuration || '—'}m
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                AVG DURATION
              </Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 2, textAlign: 'center' }}>
              <TrendingUp size={14} style={{ color: mutedColor, marginBottom: 4 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1rem' }}>
                {avgVolume ? `${(avgVolume / 1000).toFixed(1)}k` : '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                AVG VOLUME
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ flex: 1, p: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 2, textAlign: 'center' }}>
              <Dumbbell size={14} style={{ color: mutedColor, marginBottom: 4 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1rem' }}>
                {peakStrength || '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                PEAK EST. 1RM (KG)
              </Typography>
            </Box>
            <Box sx={{ flex: 1, p: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 2, textAlign: 'center' }}>
              <TrendingUp size={14} style={{ color: mutedColor, marginBottom: 4 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '1rem' }}>
                {avgStrength || '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                AVG EST. 1RM (KG)
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </MuiCard>
  );
}
