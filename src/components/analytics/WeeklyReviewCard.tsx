import { CalendarCheck, Dumbbell, ShieldCheck, TrendingDown, Check, AlertTriangle } from 'lucide-react';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';

interface Props {
  stalledCount: number;
}

/**
 * This-week training review (§5): sessions vs target, push/pull/legs balance,
 * mandatory-accessory completion, and how many lifts are stalled.
 */
export function WeeklyReviewCard({ stalledCount }: Props) {
  const s = useWeeklySummary(stalledCount);

  const sessionOk = s.sessions >= Math.min(s.sessionGoal, 3);
  const mandatoryOk = s.mandatoryTotal === 0 || s.mandatoryDone === s.mandatoryTotal;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-3">This week</div>

      <div className="grid grid-cols-2 gap-2">
        {/* Sessions */}
        <div className="rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarCheck className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Sessions</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-bold tabular-nums">{s.sessions}</span>
            <span className="text-xs text-muted-foreground">/ {s.sessionGoal} target</span>
            {s.sessions > s.sessionGoal && <AlertTriangle className="h-3.5 w-3.5 text-fuel-ink ml-auto" aria-label="over target" />}
          </div>
        </div>

        {/* Push/Pull/Legs balance */}
        <div className="rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Dumbbell className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Balance</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 text-xs font-semibold tabular-nums">
            <span>{s.push}P</span><span className="text-muted-foreground/40">·</span>
            <span>{s.pull}Pl</span><span className="text-muted-foreground/40">·</span>
            <span className={s.legBehind ? 'text-fuel-ink' : ''}>{s.legs}L</span>
            {s.legBehind && <TrendingDown className="h-3.5 w-3.5 text-fuel-ink ml-auto" aria-label="legs behind" />}
          </div>
        </div>

        {/* Mandatory accessories */}
        {s.mandatoryTotal > 0 && (
          <div className="rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Must-do</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold tabular-nums">{s.mandatoryDone}</span>
              <span className="text-xs text-muted-foreground">/ {s.mandatoryTotal} done</span>
              {mandatoryOk && <Check className="h-3.5 w-3.5 text-energy-ink ml-auto" aria-label="complete" />}
            </div>
          </div>
        )}

        {/* Stalled lifts */}
        <div className="rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Stalled</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-bold tabular-nums">{s.stalledCount}</span>
            <span className="text-xs text-muted-foreground">{s.stalledCount === 1 ? 'lift' : 'lifts'}</span>
          </div>
        </div>
      </div>

      {(!sessionOk || s.legBehind || !mandatoryOk) && (
        <p className="text-[11px] text-muted-foreground mt-3">
          {s.legBehind
            ? 'Get a leg session in before your next upper day.'
            : !mandatoryOk
              ? 'Some mandatory accessories are still outstanding this week.'
              : 'A couple more sessions keeps you on target.'}
        </p>
      )}
    </div>
  );
}
