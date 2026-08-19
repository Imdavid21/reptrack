import { Skeleton } from '@mui/material';
import { motion } from 'framer-motion';
import { Plus, AlertTriangle, Activity } from 'lucide-react';
import { MuscleIntelligence, VolumeStatus, MuscleBalance, LANDMARKS } from '@/lib/muscleInsights';

const STATUS_META: Record<VolumeStatus, { label: string; bar: string; text: string; dot: string }> = {
  untrained:    { label: 'Not trained', bar: 'bg-muted-foreground/30', text: 'text-muted-foreground', dot: 'bg-muted-foreground/40' },
  under:        { label: 'Undertrained', bar: 'bg-fuel',     text: 'text-fuel-ink',    dot: 'bg-fuel' },
  optimal:      { label: 'Optimal',      bar: 'bg-energy',   text: 'text-energy-ink',  dot: 'bg-energy' },
  high:         { label: 'High',         bar: 'bg-water',    text: 'text-water-ink',   dot: 'bg-water' },
  overreaching: { label: 'Overreaching', bar: 'bg-destructive', text: 'text-destructive', dot: 'bg-destructive' },
};

interface Props {
  data: MuscleIntelligence | null;
  isLoading: boolean;
}

/**
 * Whole-body muscle map: weekly sets per muscle vs evidence-based volume
 * landmarks, with a clear status for each (untrained / under / optimal /
 * high / overreaching) so the user sees imbalances at a glance.
 */
export function MuscleBalanceCard({ data, isLoading }: Props) {
  if (isLoading) return <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />;
  if (!data) return null;

  const trained = data.balance.filter(b => b.status !== 'untrained');
  const hasAny = trained.length > 0;

  if (!hasAny) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <div className="text-sm font-bold mb-1">Muscle balance</div>
        <p className="text-xs text-muted-foreground">Log a few workouts to map weekly volume across every muscle group.</p>
      </div>
    );
  }

  // Show trained muscles first (by weekly sets desc), then untrained.
  const ordered: MuscleBalance[] = [
    ...trained.sort((a, b) => b.weeklySets - a.weeklySets),
    ...data.balance.filter(b => b.status === 'untrained'),
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-sm font-bold">Muscle balance</div>
        <div className="text-xs text-muted-foreground">sets / week</div>
      </div>
      <div className="mb-4">
        <p className="text-xs text-muted-foreground">
          Weekly volume vs hypertrophy landmarks over the selected range.
        </p>
        {ordered.some(b => (b.fromActivity ?? 0) > 0) && (
          <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
            <Activity className="h-3 w-3 shrink-0" />
            Includes stimulus from logged activity (walk/run/cycle/boxing), not lifting alone.
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        {ordered.map((m, i) => {
          const meta = STATUS_META[m.status];
          const scale = LANDMARKS[m.bodyPart]?.mrv ?? 24;
          const pct = Math.min((m.weeklySets / scale) * 100, 100);
          return (
            <div key={m.bodyPart} className="flex items-center gap-3">
              <div className="w-24 shrink-0 text-xs font-semibold truncate">{m.bodyPart}</div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                {m.status !== 'untrained' && (
                  <motion.div
                    className={`h-full rounded-full ${meta.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }}
                  />
                )}
              </div>
              <div className="w-10 shrink-0 text-right text-xs font-bold tabular-nums">
                {m.status === 'untrained' ? '-' : m.weeklySets}
              </div>
              <div className={`w-24 shrink-0 text-right text-xs font-semibold  tracking-wide ${meta.text}`}>
                {meta.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Untrained / undertrained callouts with concrete movement ideas */}
      {(data.untrained.length > 0 || data.balance.some(b => b.status === 'under')) && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          {data.untrained.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-fuel-ink shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Not trained at all:</span>{' '}
                {data.untrained.join(', ')}. Add e.g.{' '}
                <span className="font-semibold text-foreground">
                  {data.balance.find(b => b.status === 'untrained')?.suggestion}
                </span>.
              </p>
            </div>
          )}
          {data.balance.filter(b => b.status === 'under').slice(0, 1).map(b => (
            <div key={b.bodyPart} className="flex items-start gap-2">
              <Plus className="h-3.5 w-3.5 text-energy-ink shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{b.bodyPart}</span> is below its growth
                threshold ({b.weeklySets}/wk) - try adding{' '}
                <span className="font-semibold text-foreground">{b.suggestion}</span>.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
