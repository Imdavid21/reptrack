import { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Chip, Skeleton, useTheme, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { Trophy, TrendingUp, TrendingDown, X } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { format, parseISO, startOfWeek, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';

const MUSCLE_GROUPS = [
  { key: 'chest', label: 'Chest', patterns: ['chest', 'bench', 'fly', 'flye', 'dip'] },
  { key: 'back', label: 'Back', patterns: ['row', 'pulldown', 'pull-up', 'pullup', 'chin', 'lat', 'deadlift'] },
  { key: 'shoulders', label: 'Shoulders', patterns: ['shoulder', 'overhead', 'ohp', 'lateral', 'raise', 'delt', 'arnold'] },
  { key: 'arms', label: 'Arms', patterns: ['curl', 'tricep', 'bicep', 'pushdown', 'extension', 'skull', 'hammer'] },
  { key: 'legs', label: 'Legs', patterns: ['squat', 'leg', 'lunge', 'calf', 'thrust', 'rdl', 'romanian', 'glute', 'ham'] },
  { key: 'core', label: 'Core', patterns: ['ab', 'core', 'plank', 'crunch', 'wheel'] },
];

const PASTEL_COLORS = [
  '#B5D8F7', '#F7C8B5', '#C5E8C1', '#F0D6F7',
  '#F7E8B5', '#B5F0E8', '#F7B5C8', '#D6D6F0',
];

/** Strip set identifiers like "(Set 1)", "(Set 2)" from exercise names */
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
  // Stacked data: each entry = { week, [exerciseName]: maxWeight }
  stackedWeekly: Record<string, string | number>[];
  exerciseNames: string[];
}

export function StrengthOverviewChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [hiddenExercises, setHiddenExercises] = useState<Set<string>>(new Set());
  const [dialogGroup, setDialogGroup] = useState<MuscleGroupData | null>(null);

  const { muscleGroups, totalStrength, overallGrowth } = useMemo(() => {
    if (!data?.sets) return { muscleGroups: [], totalStrength: 0, overallGrowth: 0 };

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

      // Collect all exercise names for this group
      const allExerciseNames = new Set<string>();
      sortedWeeks.forEach(([, exMap]) => exMap.forEach((_, name) => allExerciseNames.add(name)));
      const exerciseNames = Array.from(allExerciseNames).sort();

      // Build stacked weekly data
      const stackedWeekly = sortedWeeks.map(([weekKey, exMap]) => {
        const entry: Record<string, string | number> = { week: format(parseISO(weekKey), 'MMM d') };
        exerciseNames.forEach(name => {
          entry[name] = exMap.get(name) || 0;
        });
        return entry;
      });

      // Weekly total = sum of all exercise maxes (total group strength)
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
        stackedWeekly, exerciseNames,
      };
    }).filter((g): g is MuscleGroupData => g !== null && g.weeklyMaxWeights.length >= 1);

    const total = groups.reduce((sum, g) => sum + g.currentWeight, 0);
    const startTotal = groups.reduce((sum, g) => sum + g.startWeight, 0);
    const growth = startTotal > 0 ? Math.round(((total - startTotal) / startTotal) * 100) : 0;

    return { muscleGroups: groups, totalStrength: total, overallGrowth: growth };
  }, [data?.sets, dateRange]);

  // Default selected group
  const activeGroupKey = selectedGroupKey && muscleGroups.some(g => g.key === selectedGroupKey)
    ? selectedGroupKey
    : muscleGroups[0]?.key || null;

  const activeGroup = muscleGroups.find(g => g.key === activeGroupKey) || null;

  const handleGroupChipClick = useCallback((key: string) => {
    haptic('light');
    setSelectedGroupKey(key);
    setHiddenExercises(new Set());
  }, []);

  const toggleExercise = useCallback((name: string) => {
    haptic('light');
    setHiddenExercises(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

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

  const visibleExercises = activeGroup
    ? activeGroup.exerciseNames.filter(n => !hiddenExercises.has(n))
    : [];

  const chartHeight = activeGroup
    ? Math.max(120, activeGroup.stackedWeekly.length * 40 + 40)
    : 160;

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
          {activeGroup && activeGroup.growthPercent !== 0 && (
            <Chip
              size="small"
              icon={activeGroup.growthPercent > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              label={`${activeGroup.growthPercent > 0 ? '+' : ''}${activeGroup.growthPercent}%`}
              sx={{
                height: 24, fontSize: '0.7rem', fontWeight: 600,
                bgcolor: activeGroup.growthPercent > 0 ? 'action.selected' : 'action.hover',
                color: activeGroup.growthPercent > 0 ? 'text.primary' : 'error.main',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          )}
        </Box>

        {/* Muscle Group Chips */}
        <Box sx={{
          display: 'flex', gap: 0.75, mb: 2, overflowX: 'auto',
          pb: 0.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
        }}>
          {muscleGroups.map(g => (
            <Chip
              key={g.key}
              label={g.label}
              size="small"
              onClick={() => handleGroupChipClick(g.key)}
              sx={{
                flexShrink: 0,
                height: 28, fontSize: '0.72rem', fontWeight: 600,
                bgcolor: g.key === activeGroupKey
                  ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')
                  : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                border: 1,
                borderColor: g.key === activeGroupKey
                  ? (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)')
                  : 'transparent',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                },
              }}
            />
          ))}
        </Box>

        {/* Horizontal Stacked Bar Chart */}
        <AnimatePresence mode="wait">
          {activeGroup && (
            <motion.div
              key={activeGroup.key}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Box sx={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={activeGroup.stackedWeekly}
                    layout="vertical"
                    margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: isDark ? '#888' : '#666' }}
                      axisLine={false}
                      tickLine={false}
                      unit=" kg"
                    />
                    <YAxis
                      type="category"
                      dataKey="week"
                      tick={{ fontSize: 10, fill: isDark ? '#aaa' : '#555' }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                      contentStyle={{
                        backgroundColor: isDark ? '#1a1a1a' : '#fff',
                        border: 'none', borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        fontSize: '0.75rem',
                      }}
                      formatter={(value: number, name: string) => [`${value} kg`, name]}
                    />
                    {activeGroup.exerciseNames.map((name, idx) => (
                      <Bar
                        key={name}
                        dataKey={name}
                        stackId="strength"
                        fill={PASTEL_COLORS[idx % PASTEL_COLORS.length]}
                        hide={hiddenExercises.has(name)}
                        radius={
                          idx === activeGroup.exerciseNames.length - 1
                            ? [0, 4, 4, 0]
                            : undefined
                        }
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exercise Legend (toggleable) */}
        {activeGroup && (
          <Box sx={{
            display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1.5,
          }}>
            {activeGroup.exerciseNames.map((name, idx) => {
              const isHidden = hiddenExercises.has(name);
              const color = PASTEL_COLORS[idx % PASTEL_COLORS.length];
              return (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Chip
                    size="small"
                    label={name}
                    onClick={() => toggleExercise(name)}
                    sx={{
                      height: 24, fontSize: '0.65rem', fontWeight: 500,
                      opacity: isHidden ? 0.35 : 1,
                      textDecoration: isHidden ? 'line-through' : 'none',
                      bgcolor: isHidden
                        ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                        : `${color}22`,
                      border: `1.5px solid ${isHidden ? 'transparent' : color}`,
                      color: isDark ? '#ddd' : '#333',
                      '&:hover': {
                        bgcolor: `${color}33`,
                      },
                    }}
                    icon={
                      <Box sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        bgcolor: color, ml: 0.5, flexShrink: 0,
                      }} />
                    }
                  />
                </motion.div>
              );
            })}
          </Box>
        )}

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
