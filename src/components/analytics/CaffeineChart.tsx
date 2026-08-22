import { useMemo } from 'react';
import { Box, Chip, Skeleton, Typography, useTheme } from '@mui/material';
import { Coffee, Target } from 'lucide-react';
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MuiCard } from '@/components/ui/MuiCard';
import { useCaffeineData } from '@/hooks/useCaffeineData';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useGoalHistory } from '@/hooks/useGoalHistory';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export function CaffeineChart() {
  const theme = useTheme();
  const { dateRange } = useDateRange();
  const { preferences } = useUserPreferences();
  const { resolveGoal } = useGoalHistory();
  const { data, isLoading } = useCaffeineData(dateRange);
  const liveLimit = Number(preferences?.daily_caffeine_limit ?? 400);

  const chartData = useMemo(() => (data?.dailyData ?? []).map(day => ({
    ...day,
    limit: Number(resolveGoal('daily_caffeine_limit', day.date, liveLimit)),
  })), [data?.dailyData, liveLimit, resolveGoal]);

  const daysWithinLimit = useMemo(
    () => chartData.filter(day => day.logs > 0 && day.totalMg <= day.limit).length,
    [chartData],
  );
  const peak = Math.max(liveLimit, ...chartData.flatMap(day => [day.totalMg, day.limit]), 0);
  const yMax = Math.max(400, Math.ceil(peak / 100) * 100);
  const ticks = Array.from({ length: Math.floor(yMax / 100) + 1 }, (_, index) => index * 100);
  const muted = theme.palette.text.secondary;

  if (isLoading) {
    return <MuiCard><Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}><Coffee size={14} /><Typography variant="body2" fontWeight={600}>Caffeine</Typography></Box><Skeleton variant="rounded" height={180} /></MuiCard>;
  }

  if (!chartData.some(day => day.logs > 0)) {
    return <MuiCard><Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}><Coffee size={14} /><Typography variant="body2" fontWeight={600}>Caffeine</Typography></Box><Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>No caffeine data yet. New food and drink logs will include caffeine when it can be assessed.</Typography></MuiCard>;
  }

  const tooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const day = payload[0].payload;
    return <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 2, border: 1, borderColor: 'divider', p: 1.5 }}>
      <Typography variant="body2" fontWeight={600}>{label}</Typography>
      <Typography variant="caption" color="text.secondary" display="block">{Math.round(day.totalMg)} mg · {day.logs} tracked food/drink {day.logs === 1 ? 'log' : 'logs'}</Typography>
      <Typography variant="caption" color="text.secondary" display="block">Limit on this day: {Math.round(day.limit)} mg</Typography>
    </Box>;
  };

  return <MuiCard>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}><Coffee size={14} /></Box><Typography variant="body2" fontWeight={600}>Caffeine</Typography></Box>
      <Chip size="small" icon={<Target size={12} />} label={`Current ≤${Math.round(liveLimit)} mg/day`} sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600, bgcolor: 'action.hover', '& .MuiChip-icon': { color: 'inherit' } }} />
    </Box>

    <Box sx={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
          <XAxis dataKey="displayDate" tick={{ fill: muted, fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, yMax]} ticks={ticks} tick={{ fill: muted, fontSize: 12 }} axisLine={false} tickLine={false} width={46} />
          <Tooltip content={tooltip} />
          <Bar dataKey="totalMg" radius={[4, 4, 0, 0]} fill="hsl(var(--fuel))" />
          <Line dataKey="limit" type="stepAfter" stroke={muted} strokeDasharray="4 4" strokeWidth={1.5} dot={false} activeDot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>

    {data?.totals && <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
      <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center', border: 1, borderColor: 'divider' }}><Typography variant="body1" fontWeight={700}>{Math.round(data.totals.avgDailyMg)} mg</Typography><Typography variant="caption" color="text.secondary">Avg/Tracked Day</Typography></Box>
      <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center', border: 1, borderColor: 'divider' }}><Typography variant="body1" fontWeight={700}>{daysWithinLimit}/{data.totals.daysTracked}</Typography><Typography variant="caption" color="text.secondary">Days ≤ Limit</Typography></Box>
      <Box sx={{ flex: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center', border: 1, borderColor: 'divider' }}><Typography variant="body1" fontWeight={700}>{Math.round(data.totals.totalMg)} mg</Typography><Typography variant="caption" color="text.secondary">Total</Typography></Box>
    </Box>}
  </MuiCard>;
}
