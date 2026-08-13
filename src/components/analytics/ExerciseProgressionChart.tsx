import { useState, useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useExerciseSets, ExerciseProgression } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { MuiCard } from '@/components/ui/MuiCard';
import { Box, Typography, Chip, Collapse, useTheme } from '@mui/material';
import { TrendingUp, TrendingDown, ChevronDown, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMuscleGroup } from '@/lib/exerciseClassification';

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  // getMuscleGroup falls back to the literal 'other' for anything it can't
  // classify. Without an entry here, that exercise's progression still
  // showed under "All" but could never get its own filter chip.
  other: 'Other',
};

function GrowthBadge({ startWeight, endWeight }: { startWeight: number; endWeight: number }) {
  if (startWeight === 0) return null;
  const pct = Math.round(((endWeight - startWeight) / startWeight) * 100);
  if (pct === 0) return null;
  const isPositive = pct > 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded',
      isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'
    )}>
      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isPositive ? '+' : ''}{pct}%
    </span>
  );
}

function MiniChart({ data }: { data: ExerciseProgression['data'] }) {
  return (
    <ResponsiveContainer width="100%" height={50}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="currentColor" stopOpacity={0.15} />
            <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="weight"
          stroke="currentColor"
          strokeWidth={1.5}
          fill="url(#exGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ExerciseCard({ progression }: { progression: ExerciseProgression }) {
  const [expanded, setExpanded] = useState(false);
  const firstWeight = progression.data[0]?.weight || 0;
  const lastWeight = progression.data[progression.data.length - 1]?.weight || 0;
  const maxWeight = Math.max(...progression.data.map(d => d.weight));

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{progression.exerciseName}</div>
          <div className="text-xs text-muted-foreground">
            {firstWeight}kg → {lastWeight}kg · {progression.data.length}w
          </div>
        </div>
        <GrowthBadge startWeight={firstWeight} endWeight={lastWeight} />
        <span className="text-sm font-bold tabular-nums">{maxWeight}kg</span>
        <ChevronDown
          size={14}
          className={cn('text-muted-foreground transition-transform', expanded && 'rotate-180')}
        />
      </button>

      <Collapse in={expanded}>
        <div className="px-3 pb-3 border-t border-border/50">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={progression.data} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${progression.exerciseName}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                formatter={(value: number) => [`${value}kg`, 'Weight']}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill={`url(#grad-${progression.exerciseName})`}
                dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
          {/* Volume row */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Total volume: {(progression.data.reduce((sum, d) => sum + d.volume, 0) / 1000).toFixed(1)}k kg</span>
            <span>Peak: {maxWeight}kg</span>
          </div>
        </div>
      </Collapse>
    </div>
  );
}

export function ExerciseProgressionChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);
  const [showAll, setShowAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const sortedProgressions = useMemo(() => {
    return (data?.progressions || []).slice().sort((a, b) => {
      const growthPct = (p: typeof a) => {
        const d = p.data.filter(pt => pt.weight > 0);
        if (d.length < 2) return 0;
        const headCount = Math.min(2, Math.ceil(d.length / 3));
        const tailCount = headCount;
        const headAvg = d.slice(0, headCount).reduce((s, pt) => s + pt.weight, 0) / headCount;
        const tailAvg = d.slice(-tailCount).reduce((s, pt) => s + pt.weight, 0) / tailCount;
        return headAvg > 0 ? ((tailAvg - headAvg) / headAvg) * 100 : 0;
      };
      return growthPct(b) - growthPct(a);
    });
  }, [data?.progressions]);

  // Derive available muscle groups from actual data
  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    sortedProgressions.forEach(p => {
      const g = getMuscleGroup(p.exerciseName);
      if (MUSCLE_GROUP_LABELS[g]) groups.add(g);
    });
    return Array.from(groups).sort((a, b) =>
      Object.keys(MUSCLE_GROUP_LABELS).indexOf(a) - Object.keys(MUSCLE_GROUP_LABELS).indexOf(b)
    );
  }, [sortedProgressions]);

  const progressions = useMemo(() => {
    if (activeFilter === 'all') return sortedProgressions;
    return sortedProgressions.filter(p => getMuscleGroup(p.exerciseName) === activeFilter);
  }, [sortedProgressions, activeFilter]);

  const headerIcon = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{
        p: 1,
        borderRadius: 2,
        bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      }}>
        <Dumbbell size={14} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Exercise Progression
      </Typography>
    </Box>
  );

  if (isLoading) {
    return (
      <MuiCard>
        {headerIcon}
        <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="caption" color="text.secondary">Loading...</Typography>
        </Box>
      </MuiCard>
    );
  }

  if (sortedProgressions.length === 0) {
    return (
      <MuiCard>
        {headerIcon}
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          Log weighted exercises to see progression charts
        </Typography>
      </MuiCard>
    );
  }

  const visible = showAll ? progressions : progressions.slice(0, 6);

  const handleFilterChange = (group: string) => {
    setActiveFilter(group);
    setShowAll(false);
  };

  return (
    <MuiCard>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        {headerIcon}
        <Chip
          label={progressions.length}
          size="small"
          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
        />
      </Box>

      {/* Filter chips */}
      {availableGroups.length > 1 && (
        <Box sx={{
          display: 'flex',
          gap: 0.75,
          mb: 1.5,
          overflowX: 'auto',
          pb: 0.25,
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}>
          <Chip
            label="All"
            size="small"
            onClick={() => handleFilterChange('all')}
            variant={activeFilter === 'all' ? 'filled' : 'outlined'}
            sx={{
              height: 24,
              fontSize: '0.65rem',
              fontWeight: activeFilter === 'all' ? 600 : 400,
              flexShrink: 0,
              opacity: activeFilter === 'all' ? 1 : 0.6,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          />
          {availableGroups.map(group => (
            <Chip
              key={group}
              label={MUSCLE_GROUP_LABELS[group]}
              size="small"
              onClick={() => handleFilterChange(group)}
              variant={activeFilter === group ? 'filled' : 'outlined'}
              sx={{
                height: 24,
                fontSize: '0.65rem',
                fontWeight: activeFilter === group ? 600 : 400,
                flexShrink: 0,
                opacity: activeFilter === group ? 1 : 0.6,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </Box>
      )}

      <div className="space-y-2">
        {visible.map((p) => (
          <ExerciseCard key={p.exerciseName} progression={p} />
        ))}
        {progressions.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
            No exercises found for {MUSCLE_GROUP_LABELS[activeFilter]}
          </Typography>
        )}
      </div>

      {progressions.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-xs text-muted-foreground mt-3 py-2 hover:text-foreground transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${progressions.length} exercises`}
        </button>
      )}
    </MuiCard>
  );
}
