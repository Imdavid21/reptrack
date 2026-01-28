import { Box, Typography, Skeleton } from '@mui/material';
import { motion } from 'framer-motion';
import { Zap, Clock, TrendingUp } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useAutoMetrics } from '@/hooks/useAutoMetrics';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

export function EfficiencyChart() {
  const { data, isLoading } = useAutoMetrics(60);

  if (isLoading) {
    return (
      <MuiCard sx={{ bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
        <Skeleton variant="text" width={150} height={24} />
        <Skeleton variant="rounded" height={200} sx={{ mt: 2 }} />
      </MuiCard>
    );
  }

  const chartData = data?.history.map(h => ({
    date: format(parseISO(h.date), 'MMM d'),
    efficiency: h.efficiency,
    volume: Math.round(h.volume / 1000), // in thousands
    duration: h.duration,
  })) || [];

  const avgEfficiency = data?.history.length 
    ? Math.round(data.history.reduce((s, h) => s + h.efficiency, 0) / data.history.length)
    : 0;

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <Box sx={{ 
        bgcolor: 'background.paper', 
        borderRadius: 2, 
        boxShadow: 2, 
        border: '1px solid #e9ecef',
        p: 1.5,
      }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>{label}</Typography>
        {payload.map((p: any, i: number) => (
          <Typography key={i} variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {p.name}: <strong style={{ color: '#081c15' }}>{p.value}{p.unit || ''}</strong>
          </Typography>
        ))}
      </Box>
    );
  };

  return (
    <MuiCard sx={{ bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: '#d8f3dc' }}>
            <Zap size={14} style={{ color: '#081c15' }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#081c15' }}>
            Workout Efficiency
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#d8f3dc', px: 1.5, py: 0.5, borderRadius: 2 }}>
          <Typography variant="caption" sx={{ color: '#081c15', fontWeight: 600 }}>
            {avgEfficiency} kg/min avg
          </Typography>
        </Box>
      </Box>

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
        Volume lifted per minute in gym
      </Typography>

      {chartData.length > 0 ? (
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="efficiencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#95d5b2" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#95d5b2" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6c757d' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#6c757d' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#6c757d' }} axisLine={false} tickLine={false} hide />
              <Tooltip content={renderTooltip} />
              <Bar 
                yAxisId="left"
                dataKey="volume" 
                fill="url(#efficiencyGradient)" 
                radius={[4, 4, 0, 0]}
                name="Volume (k kg)"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="efficiency" 
                stroke="#081c15" 
                strokeWidth={2}
                dot={false}
                name="Efficiency"
                unit=" kg/min"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
          Log workouts to see efficiency data
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Box sx={{ flex: 1, p: 1.5, bgcolor: '#e9ecef', borderRadius: 2, textAlign: 'center' }}>
          <Clock size={14} style={{ color: '#6c757d', marginBottom: 4 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#081c15', fontSize: '1rem' }}>
            {data?.today.avgDuration || '—'}m
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            AVG DURATION
          </Typography>
        </Box>
        <Box sx={{ flex: 1, p: 1.5, bgcolor: '#e9ecef', borderRadius: 2, textAlign: 'center' }}>
          <TrendingUp size={14} style={{ color: '#6c757d', marginBottom: 4 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#081c15', fontSize: '1rem' }}>
            {data?.today.totalVolume ? `${(data.today.totalVolume / 1000).toFixed(1)}k` : '—'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            AVG VOLUME
          </Typography>
        </Box>
      </Box>
    </MuiCard>
  );
}
