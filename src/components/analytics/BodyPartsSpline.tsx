import { useState } from 'react';
import { Box, Typography, Skeleton, Chip, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { useBodyPartsProgress } from '@/hooks/useBodyPartsProgress';
import { useDateRange } from '@/contexts/DateRangeContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export function BodyPartsSpline() {
  const { dateRange } = useDateRange();
  const { data: bodyParts, isLoading } = useBodyPartsProgress(dateRange);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const accentColor = theme.palette.secondary.main;
  const selectedBg = theme.palette.action.selected;
  const negativeBg = theme.palette.action.hover;
  const surfaceBg = theme.palette.action.hover;
  const mutedColor = theme.palette.text.secondary;

  if (isLoading) {
    return (
      <MuiCard>
        <Skeleton variant="text" width={150} height={24} />
        <Box sx={{ display: 'flex', gap: 1, my: 2, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} variant="rounded" width={60} height={28} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={180} />
      </MuiCard>
    );
  }

  const selectedData = selectedPart 
    ? bodyParts?.find(b => b.bodyPart === selectedPart)
    : bodyParts?.[0];

  const chartData = selectedData?.weeks.map(w => ({
    week: w.weekLabel,
    volume: Math.round(w.volume / 1000), // in thousands
    maxWeight: w.maxWeight,
  })) || [];

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
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{label}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          Volume: <strong style={{ color: theme.palette.text.primary }}>{payload[0]?.value}k kg</strong>
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          Max: <strong style={{ color: theme.palette.text.primary }}>{payload[0]?.payload.maxWeight} kg</strong>
        </Typography>
      </Box>
    );
  };

  const GrowthIcon = ({ growth }: { growth: number }) => {
    if (growth > 5) return <TrendingUp size={12} style={{ color: theme.palette.text.primary }} />;
    if (growth < -5) return <TrendingDown size={12} style={{ color: theme.palette.error.main }} />;
    return <Minus size={12} style={{ color: mutedColor }} />;
  };

  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'success.light' }}>
          <Layers size={14} style={{ color: theme.palette.text.primary }} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Body Parts Progress
        </Typography>
      </Box>

      {/* Body part chips */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
        {bodyParts?.slice(0, 8).map((bp) => (
          <motion.div
            key={bp.bodyPart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Chip
              label={bp.bodyPart}
              size="small"
              onClick={() => setSelectedPart(bp.bodyPart === selectedPart ? null : bp.bodyPart)}
              sx={{
                fontSize: '0.65rem',
                height: 26,
                bgcolor: (selectedPart || bodyParts[0]?.bodyPart) === bp.bodyPart ? selectedBg : surfaceBg,
                color: 'text.primary',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: selectedBg,
                },
              }}
            />
          </motion.div>
        ))}
      </Box>

      {/* Growth indicator */}
      {selectedData && (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedData.bodyPart}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1.5, bgcolor: surfaceBg, borderRadius: 2 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {selectedData.bodyPart}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {(selectedData.totalVolume / 1000).toFixed(1)}k kg total volume
                </Typography>
              </Box>
              <Box sx={{ 
                ml: 'auto', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                bgcolor: selectedData.growth > 0 ? selectedBg : selectedData.growth < 0 ? negativeBg : surfaceBg,
              }}>
                <GrowthIcon growth={selectedData.growth} />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 600,
                    color: selectedData.growth > 0 ? 'text.primary' : selectedData.growth < 0 ? 'error.main' : 'text.secondary',
                  }}
                >
                  {selectedData.growth > 0 ? '+' : ''}{selectedData.growth}%
                </Typography>
              </Box>
            </Box>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Chart */}
      {chartData.length > 1 ? (
        <Box sx={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="bodyPartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accentColor} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: mutedColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: mutedColor }} axisLine={false} tickLine={false} />
              <Tooltip content={renderTooltip} />
              <Area
                type="monotone"
                dataKey="volume"
                stroke={accentColor}
                strokeWidth={2}
                fill="url(#bodyPartGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
          {bodyParts?.length ? 'Select a body part to view progress' : 'Log workouts to track body part progress'}
        </Typography>
      )}
    </MuiCard>
  );
}
