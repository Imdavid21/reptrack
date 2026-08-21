import { useMemo } from 'react';
import { Skeleton, useTheme } from '@mui/material';
import { ResponsiveContainer, AreaChart, Area, YAxis, XAxis, Tooltip, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ScorePoint } from '@/lib/bodyScore';

interface Props {
  trend: ScorePoint[];
  isLoading: boolean;
}

/**
 * Body score as a trend line - each point is the headline score over its
 * trailing 7 days, so the user can see whether their overall trajectory is
 * climbing, holding, or slipping across the selected range.
 */
export function BodyScoreTrendCard({ trend, isLoading }: Props) {
  const theme = useTheme();
  const mutedColor = theme.palette.text.secondary;

  const points = useMemo(() => trend.filter(p => p.score != null), [trend]);

  const delta = useMemo(() => {
    if (points.length === 0) return 0;
    const current = points[points.length - 1].score as number;
    const first = points[0].score as number;
    return current - first;
  }, [points]);

  if (isLoading) return <Skeleton variant="rounded" height={170} sx={{ borderRadius: 3 }} />;

  // Need at least a couple of scored points for a meaningful line.
  if (points.length < 2) return null;

  const chartData = trend.map(p => ({
    date: p.date,
    score: p.score,
    label: format(parseISO(p.date), 'MMM d'),
  }));

  const TrendIcon = delta > 1 ? TrendingUp : delta < -1 ? TrendingDown : Minus;
  const trendClass = delta > 1 ? 'text-energy-ink' : delta < -1 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="type-component-title">Body score trend</div>
          {/* No standalone "current" score here on purpose - it's a trailing-7-day
              figure that can genuinely diverge a lot from the headline card's
              longer-range average, and showing two different score-shaped numbers
              side by side reads as a bug even when both are correct. The line
              below already shows the trajectory; this is just the direction/size
              of the move. */}
          <div className={`flex items-baseline gap-1.5 mt-1 ${trendClass}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-xl font-bold tabular-nums leading-none">
              {delta > 0 ? '+' : ''}{Math.round(delta)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">over range</span>
          </div>
        </div>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--energy))" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(var(--energy))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <ReferenceLine y={70} stroke={mutedColor} strokeDasharray="3 3" strokeOpacity={0.5} />
            <XAxis dataKey="label" tick={{ fill: mutedColor, fontSize: 12 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fill: mutedColor, fontSize: 12 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              cursor={{ stroke: mutedColor, strokeWidth: 1 }}
              contentStyle={{
                background: theme.palette.background.paper,
                color: theme.palette.text.primary,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 12,
                fontSize: 12,
                padding: '6px 10px',
              }}
              labelStyle={{ color: mutedColor, fontSize: 12 }}
              formatter={(v: number | null) => [v == null ? '-' : v, 'Score']}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--energy))"
              strokeWidth={2}
              fill="url(#scoreFill)"
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Each point is your overall score over the prior 7 days. Dashed line = 70 (on track).
      </p>
    </div>
  );
}
