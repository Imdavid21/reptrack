import { AlertTriangle, BedDouble } from 'lucide-react';
import { useDeficitGuards } from '@/hooks/useDeficitGuards';

/**
 * Cut-phase warnings on the log screen (§2.6/§2.7): a mandatory rest-day prompt
 * after 5+ consecutive training days, and a 6th-session-in-7-days caution. Both
 * are advisory — they inform, they don't block logging a genuine session.
 */
export function DeficitGuardBanner() {
  const { deficitMode, needsRest, overSessionCap, consecutiveDays, sessionsLast7 } = useDeficitGuards();

  if (!deficitMode) return null;

  if (needsRest) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
        <BedDouble className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-semibold text-foreground">Rest day due — {consecutiveDays} days trained in a row</div>
          <p className="text-muted-foreground mt-0.5">
            During a cut, recovery capacity is reduced. A rest day now will protect your strength better than another session.
          </p>
        </div>
      </div>
    );
  }

  if (overSessionCap) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-fuel/30 bg-fuel-soft p-3">
        <AlertTriangle className="h-4 w-4 text-fuel-ink shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-semibold text-foreground">That's {sessionsLast7} sessions in 7 days</div>
          <p className="text-muted-foreground mt-0.5">
            Your cut target is 5/week. Recovery is limited in a deficit — consider resting instead of a 6th session.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
