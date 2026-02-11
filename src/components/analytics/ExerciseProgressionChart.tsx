import { useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useExerciseSets, ExerciseProgression } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';
import { MuiCard } from '@/components/ui/MuiCard';
import { Box, Typography, Chip, Collapse } from '@mui/material';
import { TrendingUp, TrendingDown, ChevronDown, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

function GrowthBadge({ startWeight, endWeight }: { startWeight: number; endWeight: number }) {
  if (startWeight === 0) return null;
  const pct = Math.round(((endWeight - startWeight) / startWeight) * 100);
  if (pct === 0) return null;
  const isPositive = pct > 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded',
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
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Dumbbell size={14} />
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary' }}>
            EXERCISE PROGRESSION
          </Typography>
        </Box>
        <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="caption" color="text.secondary">Loading...</Typography>
        </Box>
      </MuiCard>
    );
  }

  const progressions = data?.progressions || [];
  if (progressions.length === 0) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Dumbbell size={14} />
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary' }}>
            EXERCISE PROGRESSION
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          Log weighted exercises to see progression charts
        </Typography>
      </MuiCard>
    );
  }

  const visible = showAll ? progressions : progressions.slice(0, 6);

  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Dumbbell size={14} />
          <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary' }}>
            EXERCISE PROGRESSION
          </Typography>
          <Chip label={progressions.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
        </Box>
      </Box>

      <div className="space-y-2">
        {visible.map((p) => (
          <ExerciseCard key={p.exerciseName} progression={p} />
        ))}
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
