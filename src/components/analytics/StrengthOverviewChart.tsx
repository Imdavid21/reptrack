import { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Chip, Skeleton, useTheme, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { Trophy, TrendingUp, TrendingDown, X } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { format, parseISO, startOfWeek, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';
import { useIsMobile } from '@/hooks/use-mobile';

const MUSCLE_GROUPS = [
  { key: 'chest', label: 'Chest', patterns: ['chest', 'bench', 'fly', 'flye', 'dip'] },
  { key: 'back', label: 'Back', patterns: ['row', 'pulldown', 'pull-up', 'pullup', 'chin', 'lat', 'deadlift'] },
  { key: 'shoulders', label: 'Shoulders', patterns: ['shoulder', 'overhead', 'ohp', 'lateral', 'raise', 'delt', 'arnold'] },
  { key: 'arms', label: 'Arms', patterns: ['curl', 'tricep', 'bicep', 'pushdown', 'extension', 'skull', 'hammer'] },
  { key: 'legs', label: 'Legs', patterns: ['squat', 'leg', 'lunge', 'calf', 'thrust', 'rdl', 'romanian', 'glute', 'ham'] },
  { key: 'core', label: 'Core', patterns: ['ab', 'core', 'plank', 'crunch', 'wheel'] },
];

const BODY_PART_COLORS = ['#7EB8DA', '#DA8F7E', '#82C991'];

function normalizeExerciseName(name: string): string {
  return name.replace(/\s*\(set\s*\d+\)\s*/gi, '').trim();
}

function getMuscleGroup(exerciseName: string): string {
  const lower = exerciseName.toLowerCase();
  for (const group of MUSCLE_GROUPS) {
    if (group.patterns.some(p => lower.includes(p))) return group.key;
  }
  return 'other';
}

interface MuscleGroupData {
  key: string;
  label: string;
  weeklyMaxWeights: { week: string; weekKey: string; weight: number }[];
  startWeight: number;
  currentWeight: number;
  growthPercent: number;
  exercises: { name: string; maxWeight: number; recentWeight: number }[];
  // Per-week exercise breakdown for tooltip
  weeklyExerciseBreakdown: Map<string, { name: string; weight: number }[]>;
}

export function StrengthOverviewChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useIsMobile();
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);
  const [dialogGroup, setDialogGroup] = useState<MuscleGroupData | null>(null);

  const { muscleGroups, top3, chartData, totalStrength, overallGrowth } = useMemo(() => {
    if (!data?.sets) return { muscleGroups: [], top3: [], chartData: [], totalStrength: 0, overallGrowth: 0 };

    const filteredSets = data.sets.filter(set => {
      if (!set.workout_date) return false;
      const date = parseISO(set.workout_date);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });

    // Group by muscle group -> week -> exercise -> max weight
    const groupData = new Map<string, Map<string, Map<string, number>>>();

    filteredSets.forEach(set => {
      if (!set.workout_date || !set.actual_weight) return;
      const exName = normalizeExerciseName(set.exercise_name);
      const muscleGroup = getMuscleGroup(exName);
      const weekStart = startOfWeek(parseISO(set.workout_date), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!groupData.has(muscleGroup)) groupData.set(muscleGroup, new Map());
      const weekMap = groupData.get(muscleGroup)!;
      if (!weekMap.has(weekKey)) weekMap.set(weekKey, new Map());
      const exerciseMap = weekMap.get(weekKey)!;

      const currentMax = exerciseMap.get(exName) || 0;
      exerciseMap.set(exName, Math.max(currentMax, set.actual_weight));
    });

    const groups: MuscleGroupData[] = MUSCLE_GROUPS.map(group => {
      const weekMap = groupData.get(group.key);
      if (!weekMap || weekMap.size === 0) return null;

      const sortedWeeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

      // Per-week exercise breakdown for tooltip
      const weeklyExerciseBreakdown = new Map<string, { name: string; weight: number }[]>();
      sortedWeeks.forEach(([weekKey, exMap]) => {
        const exercises = Array.from(exMap.entries())
          .map(([name, weight]) => ({ name, weight }))
          .sort((a, b) => b.weight - a.weight);
        weeklyExerciseBreakdown.set(format(parseISO(weekKey), 'MMM d'), exercises);
      });

      const weeklyMaxWeights = sortedWeeks.map(([weekKey, exerciseMap]) => ({
        week: format(parseISO(weekKey), 'MMM d'),
        weekKey,
        weight: Array.from(exerciseMap.values()).reduce((s, v) => s + v, 0),
      }));

      const exerciseMaxes = new Map<string, { max: number; recent: number }>();
      sortedWeeks.forEach(([, exerciseMap], weekIdx) => {
        exerciseMap.forEach((weight, name) => {
          const current = exerciseMaxes.get(name) || { max: 0, recent: 0 };
          current.max = Math.max(current.max, weight);
          if (weekIdx === sortedWeeks.length - 1) current.recent = weight;
          exerciseMaxes.set(name, current);
        });
      });

      const exercises = Array.from(exerciseMaxes.entries())
        .map(([name, d]) => ({ name, maxWeight: d.max, recentWeight: d.recent }))
        .sort((a, b) => b.maxWeight - a.maxWeight);

      const startWeight = weeklyMaxWeights[0]?.weight || 0;
      const currentWeight = weeklyMaxWeights[weeklyMaxWeights.length - 1]?.weight || 0;
      const growthPercent = startWeight > 0
        ? Math.round(((currentWeight - startWeight) / startWeight) * 100) : 0;

      return {
        key: group.key, label: group.label, weeklyMaxWeights,
        startWeight, currentWeight, growthPercent, exercises,
        weeklyExerciseBreakdown,
      };
    }).filter((g): g is MuscleGroupData => g !== null && g.weeklyMaxWeights.length >= 1);

    // Top 3 by current weight
    const sorted = [...groups].sort((a, b) => b.currentWeight - a.currentWeight);
    const top3Groups = sorted.slice(0, 3);

    // Build unified chart data
    const allWeeks = new Set<string>();
    top3Groups.forEach(g => g.weeklyMaxWeights.forEach(w => allWeeks.add(w.week)));
    const weeksSorted = Array.from(allWeeks).sort();

    const unified = weeksSorted.map(week => {
      const entry: Record<string, string | number> = { week };
      top3Groups.forEach(g => {
        const found = g.weeklyMaxWeights.find(w => w.week === week);
        entry[g.key] = found ? found.weight : 0;
      });
      return entry;
    });

    const total = groups.reduce((sum, g) => sum + g.currentWeight, 0);
    const startTotal = groups.reduce((sum, g) => sum + g.startWeight, 0);
    const growth = startTotal > 0 ? Math.round(((total - startTotal) / startTotal) * 100) : 0;

    return { muscleGroups: groups, top3: top3Groups, chartData: unified, totalStrength: total, overallGrowth: growth };
  }, [data?.sets, dateRange]);

  const handleAreaClick = useCallback((groupKey: string) => {
    haptic('light');
    const group = muscleGroups.find(g => g.key === groupKey);
    if (group) setDialogGroup(group);
  }, [muscleGroups]);

  if (isLoading) {
    return (
      <MuiCard>
        <Skeleton variant="text" width={200} height={24} />
        <Skeleton variant="rounded" height={280} sx={{ mt: 2 }} />
      </MuiCard>
    );
  }

  if (muscleGroups.length === 0) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
            <Trophy size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Strength Overview</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          Log workouts with weights to see strength progression
        </Typography>
      </MuiCard>
    );
  }

  const chartHeight = 180;

  return (
    <>
      <MuiCard>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
              <Trophy size={14} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Strength Overview</Typography>
          </Box>
          {overallGrowth !== 0 && (
            <Chip
              size="small"
              icon={overallGrowth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              label={`${overallGrowth > 0 ? '+' : ''}${overallGrowth}%`}
              sx={{
                height: 24, fontSize: '0.7rem', fontWeight: 600,
                bgcolor: overallGrowth > 0 ? 'action.selected' : 'action.hover',
                color: overallGrowth > 0 ? 'text.primary' : 'error.main',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          )}
        </Box>

        {/* Top 3 body part chips (labels only) */}
        <Box sx={{ display: 'flex', gap: 0.75, mb: 2 }}>
          {top3.map((g, idx) => (
            <Chip
              key={g.key}
              label={g.label}
              size="small"
              onClick={() => handleAreaClick(g.key)}
              sx={{
                height: 24, fontSize: '0.68rem', fontWeight: 600,
                bgcolor: 'transparent',
                border: 1,
                borderColor: BODY_PART_COLORS[idx],
                color: BODY_PART_COLORS[idx],
                '&:hover': { bgcolor: `${BODY_PART_COLORS[idx]}22` },
              }}
            />
          ))}
        </Box>

        {/* Multi-body-part Area Chart */}
        <AnimatePresence mode="wait">
          <motion.div
            key="body-parts-chart"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Box sx={{ height: chartHeight, mx: -1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
                  onClick={(e) => {
                    if (e?.activeLabel && isMobile) {
                      // On mobile tap, find which body part has highest value at this point
                      const point = chartData.find(d => d.week === e.activeLabel);
                      if (point) {
                        const best = top3.reduce((a, b) =>
                          (point[a.key] as number) >= (point[b.key] as number) ? a : b
                        );
                        handleAreaClick(best.key);
                      }
                    }
                  }}
                >
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 9, fill: isDark ? '#888' : '#666' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: isDark ? '#888' : '#666' }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tickFormatter={(v: number) => `${v}`}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        top3={top3}
                        isDark={isDark}
                        onGroupClick={handleAreaClick}
                      />
                    }
                  />
                  {top3.map((g, idx) => (
                    <Area
                      key={g.key}
                      type="monotone"
                      dataKey={g.key}
                      stroke={BODY_PART_COLORS[idx]}
                      fill={BODY_PART_COLORS[idx]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: BODY_PART_COLORS[idx] }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </motion.div>
        </AnimatePresence>

        {/* Strength Index */}
        {totalStrength > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Box sx={{
              p: 2, mt: 2,
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              borderRadius: 2, textAlign: 'center',
              border: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                {totalStrength.toLocaleString()} kg
              </Typography>
              <Typography variant="caption" sx={{
                color: 'text.secondary', letterSpacing: '0.08em',
                fontWeight: 500, fontSize: '0.65rem',
              }}>
                STRENGTH INDEX
              </Typography>
            </Box>
          </motion.div>
        )}
      </MuiCard>

      {/* Drill-down Dialog */}
      <ExerciseBreakdownDialog
        group={dialogGroup}
        isDark={isDark}
        onClose={() => setDialogGroup(null)}
      />
    </>
  );
}

// Custom tooltip showing exercise breakdown per body part
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  top3: MuscleGroupData[];
  isDark: boolean;
  onGroupClick: (key: string) => void;
}

function CustomTooltip({ active, payload, label, top3, isDark, onGroupClick }: CustomTooltipProps) {
  if (!active || !payload || !label) return null;

  return (
    <Box sx={{
      bgcolor: isDark ? '#1a1a1a' : '#fff',
      borderRadius: 2, p: 1.5,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      minWidth: 160, maxWidth: 220,
    }}>
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
        {label}
      </Typography>
      {payload.map((entry: any, idx: number) => {
        const group = top3.find(g => g.key === entry.dataKey);
        if (!group || !entry.value) return null;

        // Get exercise breakdown for this week
        const exercises = group.weeklyExerciseBreakdown.get(label as string) || [];

        return (
          <Box
            key={entry.dataKey}
            onClick={() => onGroupClick(entry.dataKey)}
            sx={{
              mb: idx < payload.length - 1 ? 1 : 0,
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BODY_PART_COLORS[top3.indexOf(group)] }} />
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                {group.label}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, ml: 'auto', fontSize: '0.72rem' }}>
                {entry.value} kg
              </Typography>
            </Box>
            {exercises.slice(0, 3).map(ex => (
              <Typography key={ex.name} variant="caption" sx={{
                display: 'block', color: 'text.secondary',
                fontSize: '0.62rem', pl: 2, lineHeight: 1.4,
              }}>
                {ex.name}: {ex.weight}kg
              </Typography>
            ))}
            {exercises.length > 3 && (
              <Typography variant="caption" sx={{
                display: 'block', color: 'text.secondary',
                fontSize: '0.58rem', pl: 2, fontStyle: 'italic',
              }}>
                +{exercises.length - 3} more
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// Drill-down dialog
interface ExerciseBreakdownDialogProps {
  group: MuscleGroupData | null;
  isDark: boolean;
  onClose: () => void;
}

function ExerciseBreakdownDialog({ group, isDark, onClose }: ExerciseBreakdownDialogProps) {
  if (!group) return null;
  const maxWeight = Math.max(...group.exercises.map(e => e.maxWeight));

  return (
    <Dialog open={!!group} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 3, bgcolor: 'background.paper' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{group.label}</Typography>
          {group.growthPercent !== 0 && (
            <Chip size="small" label={`${group.growthPercent > 0 ? '+' : ''}${group.growthPercent}%`}
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600,
                bgcolor: group.growthPercent > 0 ? 'success.main' : 'error.main', color: 'white' }} />
          )}
        </Box>
        <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Box sx={{ height: 100, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={group.weeklyMaxWeights} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: isDark ? '#888' : '#666' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#1a1a1a' : '#fff', border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                formatter={(value: number) => [`${value} kg`, 'Max Weight']} />
              <Area type="monotone" dataKey="weight" stroke={isDark ? '#fff' : '#000'} strokeWidth={2}
                fill={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
          EXERCISES ({group.exercises.length})
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {group.exercises.map((exercise, idx) => (
            <motion.div key={exercise.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {exercise.name}
                  </Typography>
                  <Box sx={{ height: 4, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 2, mt: 0.5, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${(exercise.maxWeight / maxWeight) * 100}%`, bgcolor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)', borderRadius: 2 }} />
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', minWidth: 50, textAlign: 'right' }}>
                  {exercise.maxWeight}kg
                </Typography>
              </Box>
            </motion.div>
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
