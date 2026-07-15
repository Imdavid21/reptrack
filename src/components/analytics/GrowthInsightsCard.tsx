import { Skeleton } from '@mui/material';
import { Trophy, RefreshCw, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { MuscleIntelligence } from '@/lib/muscleInsights';

interface Props {
  data: MuscleIntelligence | null;
  isLoading: boolean;
}

/**
 * The actionable growth layer: PRs hit this period, plateaus with a concrete
 * "switch to this variation" prompt, and muscles with room for more volume.
 */
export function GrowthInsightsCard({ data, isLoading }: Props) {
  if (isLoading) return <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />;
  if (!data) return null;

  const hasContent = data.prs.length > 0 || data.plateaus.length > 0 || data.growthRoom.length > 0 || data.regressions.length > 0;
  if (!hasContent) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
        Growth signals
      </div>

      {/* PRs */}
      {data.prs.slice(0, 3).map(pr => (
        <div key={`pr-${pr.exercise}`} className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-energy-soft flex items-center justify-center shrink-0">
            <Trophy className="h-4 w-4 text-energy-ink" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">
              New PR · {pr.exercise}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {pr.weight}kg × {pr.reps} — est. 1RM {pr.e1rm}kg. Ride the momentum and push for another rep next time.
            </div>
          </div>
        </div>
      ))}

      {/* Plateaus → variation switch (the growth hack) */}
      {data.plateaus.slice(0, 3).map(p => (
        <div key={`plateau-${p.exercise}`} className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-recover-soft flex items-center justify-center shrink-0">
            <RefreshCw className="h-4 w-4 text-recover-ink" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight flex items-center gap-1.5">
              {p.exercise} has stalled
              <span className="text-[9px] font-bold uppercase tracking-wide bg-recover-soft text-recover-ink px-1 py-0.5 rounded shrink-0">
                {p.intervention === 'mini-deload' ? 'step 1' : p.intervention === 'stimulus-change' ? 'step 2' : 'deload'}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              No new top-end in {p.sessionsStalled} sessions (best ≈ {p.bestE1rm}kg 1RM).{' '}
              <span className="inline-flex items-center gap-0.5">
                {p.intervention === 'stimulus-change' && p.switchTo && <ArrowRight className="h-3 w-3 text-recover-ink" />}
                <span className="text-foreground">{p.interventionAction}</span>
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Regressions (§2.3) — expected on a cut, flagged for trend */}
      {data.regressions.slice(0, 2).map(r => (
        <div key={`reg-${r.exercise}`} className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-fuel-soft flex items-center justify-center shrink-0">
            <TrendingDown className="h-4 w-4 text-fuel-ink" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">{r.exercise} dipped {r.dropPct}%</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Below your recent sessions. On a cut this is expected — hold the weight, keep protein and sleep up, and it'll rebound.
            </div>
          </div>
        </div>
      ))}

      {/* Add-volume opportunities */}
      {data.growthRoom.length > 0 && (
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-fuel-soft flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-fuel-ink" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">Room to grow</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {data.growthRoom.slice(0, 4).join(', ')} {data.growthRoom.length === 1 ? 'has' : 'have'} room
              for 1–2 more weekly sets before hitting peak productive volume.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
