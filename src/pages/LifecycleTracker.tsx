import { MainLayout } from '@/components/layout/MainLayout';
import { AnimatedPage, staggerContainer, staggerItem } from '@/components/layout/AnimatedPage';
import { motion } from 'framer-motion';
import { Skeleton } from '@mui/material';
import { TrendingUp, Calendar } from 'lucide-react';
import { useAdaptiveMode } from '@/hooks/useAdaptiveMode';
import { MOVEMENT_PATTERN_LIST } from '@/lib/adaptiveRoster';
import { LifecycleRecord } from '@/lib/adaptiveEngine';
import { differenceInCalendarDays, parseISO } from 'date-fns';

function durationDays(l: LifecycleRecord): number {
  const end = l.end_date ? parseISO(l.end_date) : new Date();
  return Math.max(1, differenceInCalendarDays(end, parseISO(l.start_date)));
}

/**
 * Per-pattern rotation history: the full variation chain, cumulative
 * carryover_total over time, and lifecycle-duration trend (a proxy for
 * training maturity — are lifecycles taking longer or shorter to exhaust?).
 * Spec Section 6.
 */
export default function LifecycleTracker() {
  const { patternStates, lifecycles, isLoading } = useAdaptiveMode();

  return (
    <MainLayout showBack backTo="/app/settings">
      <AnimatedPage>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="px-4 pt-4 pb-24 space-y-4 max-w-lg mx-auto">
          <motion.div variants={staggerItem}>
            <h1 className="text-xl font-bold">Lifecycle Tracker</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rotation history and cumulative carryover per movement pattern.
            </p>
          </motion.div>

          {isLoading && (
            <motion.div variants={staggerItem}>
              <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
            </motion.div>
          )}

          {!isLoading && MOVEMENT_PATTERN_LIST.map((pattern) => {
            const state = patternStates.find(s => s.pattern.key === pattern.key)!;
            const chain = lifecycles
              .filter(l => l.movement_pattern === pattern.key)
              .sort((a, b) => a.start_date.localeCompare(b.start_date));

            if (chain.length === 0) {
              return (
                <motion.div key={pattern.key} variants={staggerItem} className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-sm font-bold">{pattern.name}</div>
                  <p className="text-[11px] text-muted-foreground mt-1">No lifecycles tracked yet.</p>
                </motion.div>
              );
            }

            const durations = chain.filter(l => l.status === 'closed').map(durationDays);
            const trendingFaster = durations.length >= 2 && durations.at(-1)! < durations[0];

            return (
              <motion.div key={pattern.key} variants={staggerItem} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-baseline justify-between mb-3">
                  <div className="text-sm font-bold">{pattern.name}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    +{Math.round(state.carryoverTotal * 10) / 10}kg total
                  </div>
                </div>

                <div className="space-y-2">
                  {chain.map((l) => (
                    <div key={l.id} className="flex items-center gap-2.5 text-xs">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${l.status === 'active' ? 'bg-energy' : 'bg-muted-foreground/40'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{l.variation_name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {l.start_date} → {l.end_date ?? 'active'} · {durationDays(l)}d
                          {l.weak_points_targeted?.length ? ` · ${l.weak_points_targeted.join(', ')}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <div className="font-bold">{l.starting_load ?? '—'}{l.ending_load != null ? ` → ${l.ending_load}` : ''}kg</div>
                        {l.carryover_out != null && (
                          <div className="text-[10px] text-energy-ink font-semibold">+{l.carryover_out}kg</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {durations.length >= 2 && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <TrendingUp className={`h-3.5 w-3.5 shrink-0 ${trendingFaster ? 'text-energy-ink' : 'text-fuel-ink rotate-180'}`} />
                    Lifecycles are {trendingFaster ? 'closing faster' : 'running longer'} than when you started this pattern
                    ({durations[0]}d → {durations.at(-1)}d) — {trendingFaster ? 'a sign of rising training maturity' : 'still building a base here'}.
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatedPage>
    </MainLayout>
  );
}
