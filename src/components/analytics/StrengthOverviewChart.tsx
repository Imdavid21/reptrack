import { useState, useMemo } from 'react';
import { Box, Typography, Chip, Skeleton, useTheme, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { Trophy, TrendingUp, TrendingDown, X, ChevronRight } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { format, parseISO, startOfWeek, isWithinInterval } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';
import { getMuscleGroup, stripSetSuffix } from '@/lib/exerciseClassification';

// Labels for chip rendering
const MUSCLE_GROUP_LABELS = [
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'arms', label: 'Arms' },
  { key: 'legs', label: 'Legs' },
  { key: 'core', label: 'Core' },
];
interface MuscleGroupData {
  key: string;
  label: string;
  weeklyMaxWeights: { week: string; weekKey: string; weight: number }[];
  startWeight: number;
  currentWeight: number;
  growthPercent: number;
  exercises: { name: string; maxWeight: number; recentWeight: number }[];
}

export function StrengthOverviewChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroupData | null>(null);

  // Process data into muscle group sparklines
  const { muscleGroups, totalStrength, overallGrowth } = useMemo(() => {
    if (!data?.sets) return { muscleGroups: [], totalStrength: 0, overallGrowth: 0 };

    // Filter by date range
    const filteredSets = data.sets.filter(set => {
      if (!set.workout_date) return false;
      const date = parseISO(set.workout_date);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });

    // Group by muscle group, week, and exercise
    const groupData = new Map<string, Map<string, Map<string, number>>>();
    
    filteredSets.forEach(set => {
      if (!set.workout_date || !set.actual_weight) return;
      
      const muscleGroup = getMuscleGroup(set.exercise_name);
      const weekStart = startOfWeek(parseISO(set.workout_date), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!groupData.has(muscleGroup)) {
        groupData.set(muscleGroup, new Map());
      }
      const weekMap = groupData.get(muscleGroup)!;
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, new Map());
      }
      const exerciseMap = weekMap.get(weekKey)!;
      
      const exerciseName = stripSetSuffix(set.exercise_name);
      const currentMax = exerciseMap.get(exerciseName) || 0;
      exerciseMap.set(exerciseName, Math.max(currentMax, set.actual_weight));
    });

    // Build muscle group objects
    const groups: MuscleGroupData[] = MUSCLE_GROUP_LABELS.map(group => {
      const weekMap = groupData.get(group.key);
      if (!weekMap || weekMap.size === 0) {
        return null;
      }

      // Sort weeks and build weekly max (sum of all exercise maxes in that group)
      const sortedWeeks = Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      const weeklyMaxWeights = sortedWeeks.map(([weekKey, exerciseMap]) => {
        // Take max weight across all exercises in this group for this week
        const maxWeight = Math.max(...Array.from(exerciseMap.values()));
        return {
          week: format(parseISO(weekKey), 'MMM d'),
          weekKey,
          weight: maxWeight,
        };
      });

      // Get all exercises with their max weights
      const exerciseMaxes = new Map<string, { max: number; recent: number }>();
      sortedWeeks.forEach(([, exerciseMap], weekIdx) => {
        exerciseMap.forEach((weight, name) => {
          const current = exerciseMaxes.get(name) || { max: 0, recent: 0 };
          current.max = Math.max(current.max, weight);
          if (weekIdx === sortedWeeks.length - 1) {
            current.recent = weight;
          }
          exerciseMaxes.set(name, current);
        });
      });

      const exercises = Array.from(exerciseMaxes.entries())
        .map(([name, data]) => ({ name, maxWeight: data.max, recentWeight: data.recent }))
        .sort((a, b) => b.maxWeight - a.maxWeight);

      const startWeight = weeklyMaxWeights[0]?.weight || 0;
      const currentWeight = weeklyMaxWeights[weeklyMaxWeights.length - 1]?.weight || 0;
      const growthPercent = startWeight > 0 
        ? Math.round(((currentWeight - startWeight) / startWeight) * 100)
        : 0;

      return {
        key: group.key,
        label: group.label,
        weeklyMaxWeights,
        startWeight,
        currentWeight,
        growthPercent,
        exercises,
      };
    }).filter((g): g is MuscleGroupData => g !== null && g.weeklyMaxWeights.length >= 1);

    // Calculate total strength (sum of current max weights across groups)
    const total = groups.reduce((sum, g) => sum + g.currentWeight, 0);
    
    // Overall growth
    const startTotal = groups.reduce((sum, g) => sum + g.startWeight, 0);
    const growth = startTotal > 0 ? Math.round(((total - startTotal) / startTotal) * 100) : 0;

    return { muscleGroups: groups, totalStrength: total, overallGrowth: growth };
  }, [data?.sets, dateRange]);

  const handleGroupClick = (group: MuscleGroupData) => {
    haptic('light');
    setSelectedGroup(group);
  };

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
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          }}>
            <Trophy size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Strength Overview
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          Log workouts with weights to see strength progression
        </Typography>
      </MuiCard>
    );
  }

  return (
    <>
      <MuiCard>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              p: 1, 
              borderRadius: 2, 
              bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            }}>
              <Trophy size={14} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Strength Overview
            </Typography>
          </Box>
          {overallGrowth !== 0 && (
            <Chip
              size="small"
              icon={overallGrowth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              label={`${overallGrowth > 0 ? '+' : ''}${overallGrowth}%`}
              sx={{
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 600,
                bgcolor: overallGrowth > 0 ? 'action.selected' : 'action.hover',
                color: overallGrowth > 0 ? 'text.primary' : 'error.main',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          )}
        </Box>

        {/* Sparkline Grid - 3 column layout with centered last row */}
        <Box sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 2,
          justifyContent: 'center',
        }}>
          {muscleGroups.map((group, idx) => (
            <motion.div
              key={group.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{ 
                flex: '0 0 calc(33.333% - 8px)',
                minWidth: 100,
                maxWidth: 180,
              }}
            >
              <SparklineCard
                group={group}
                isDark={isDark}
                onClick={() => handleGroupClick(group)}
              />
            </motion.div>
          ))}
        </Box>

        {/* Strength Index */}
        {totalStrength > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Box sx={{
              p: 2,
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              borderRadius: 2,
              textAlign: 'center',
              border: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                {totalStrength.toLocaleString()} kg
              </Typography>
              <Typography variant="caption" sx={{ 
                color: 'text.secondary', 
                letterSpacing: '0.08em',
                fontWeight: 500,
                fontSize: '0.65rem',
              }}>
                STRENGTH INDEX
              </Typography>
            </Box>
          </motion.div>
        )}
      </MuiCard>

      {/* Drill-down Dialog */}
      <ExerciseBreakdownDialog
        group={selectedGroup}
        isDark={isDark}
        onClose={() => setSelectedGroup(null)}
      />
    </>
  );
}

interface SparklineCardProps {
  group: MuscleGroupData;
  isDark: boolean;
  onClick: () => void;
}

function SparklineCard({ group, isDark, onClick }: SparklineCardProps) {
  const hasGrowth = group.growthPercent !== 0;
  const isPositive = group.growthPercent > 0;

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
        border: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
      }}
    >
      {/* Label + Growth */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
          {group.label}
        </Typography>
        {hasGrowth && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.25,
            color: isPositive ? 'success.main' : 'error.main',
          }}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600 }}>
              {isPositive ? '+' : ''}{group.growthPercent}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* Weight progression */}
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
        {group.startWeight}kg → <strong>{group.currentWeight}kg</strong>
      </Typography>

      {/* Sparkline */}
      <Box sx={{ height: 40, mt: 0.5, mx: -0.5 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={group.weeklyMaxWeights} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Area
              type="monotone"
              dataKey="weight"
              stroke={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
              strokeWidth={1.5}
              fill={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {/* Tap hint */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.55rem' }}>
          {group.exercises.length} exercises
        </Typography>
        <ChevronRight size={10} style={{ opacity: 0.4 }} />
      </Box>
    </Box>
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
    <Dialog
      open={!!group}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: 'background.paper',
        },
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {group.label}
          </Typography>
          {group.growthPercent !== 0 && (
            <Chip
              size="small"
              label={`${group.growthPercent > 0 ? '+' : ''}${group.growthPercent}%`}
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: group.growthPercent > 0 ? 'success.main' : 'error.main',
                color: 'white',
              }}
            />
          )}
        </Box>
        <IconButton size="small" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* Weekly progression chart */}
        <Box sx={{ height: 100, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={group.weeklyMaxWeights} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
              <XAxis 
                dataKey="week" 
                tick={{ fontSize: 9, fill: isDark ? '#888' : '#666' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1a1a1a' : '#fff',
                  border: 'none',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number) => [`${value} kg`, 'Max Weight']}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke={isDark ? '#fff' : '#000'}
                strokeWidth={2}
                fill={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>

        {/* Exercise breakdown */}
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1, display: 'block' }}>
          EXERCISES ({group.exercises.length})
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {group.exercises.map((exercise, idx) => (
            <motion.div
              key={exercise.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                py: 0.75,
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ 
                    fontWeight: 500, 
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {exercise.name}
                  </Typography>
                  {/* Progress bar */}
                  <Box sx={{ 
                    height: 4, 
                    bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    borderRadius: 2,
                    mt: 0.5,
                    overflow: 'hidden',
                  }}>
                    <Box sx={{
                      height: '100%',
                      width: `${(exercise.maxWeight / maxWeight) * 100}%`,
                      bgcolor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)',
                      borderRadius: 2,
                    }} />
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
