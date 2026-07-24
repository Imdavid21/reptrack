import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, RefreshCw, AlertTriangle, Sparkles, History } from 'lucide-react';
import { useAdaptiveMode, AdaptivePatternState } from '@/hooks/useAdaptiveMode';
import { FormBreakdownLogger } from './FormBreakdownLogger';
import { defaultBackoffLoad } from '@/lib/adaptiveEngine';
import { localDateKey } from '@/lib/dateKey';
import { cn } from '@/lib/utils';

const END_TRIGGER_LABEL: Record<string, string> = {
  reps_floor: 'Reps hit the floor',
  load_stall: 'Load has stalled',
  form_breakdown: 'Form breaking down',
  duration_cap: 'Lifecycle duration cap reached',
};

function choiceKey(patternKey: string) {
  return `adaptive-choice-${patternKey}-${localDateKey()}`;
}

/** Local, per-day "which programming am I following" preference — informational only, doesn't touch the regular programming engine. */
function useDayChoice(patternKey: string) {
  const key = choiceKey(patternKey);
  const [choice, setChoice] = useState<'regular' | 'adaptive'>(() => (localStorage.getItem(key) as 'regular' | 'adaptive') || 'regular');
  const update = (v: 'regular' | 'adaptive') => {
    setChoice(v);
    localStorage.setItem(key, v);
  };
  return [choice, update] as const;
}

function PatternRow({ state }: { state: AdaptivePatternState }) {
  const { pattern, activeLifecycle, endTrigger, openWeakPoint, sessionTargets, whyText, historySeed } = state;
  const [expanded, setExpanded] = useState(false);
  const [choice, setChoice] = useDayChoice(pattern.key);
  const { startPattern, logSession, rotateVariation } = useAdaptiveMode();
  const [startingLoad, setStartingLoad] = useState('20');
  const [selectedVariation, setSelectedVariation] = useState(pattern.variations[0].name);
  const touchedRef = useRef(false);

  // Prefill (never auto-submit) from detected history the moment it arrives,
  // as long as the user hasn't already started editing the form themselves.
  useEffect(() => {
    if (historySeed && !touchedRef.current) {
      setSelectedVariation(historySeed.variationName);
      setStartingLoad(String(historySeed.startingLoad));
    }
  }, [historySeed]);

  if (!activeLifecycle) {
    return (
      <div className="rounded-xl border border-border p-3">
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between text-left gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{pattern.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {historySeed ? `Suggestion available from your history` : `Not started — key movement: ${pattern.keyMovement}`}
            </div>
          </div>
          <ChevronRight className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', expanded && 'rotate-90')} />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-3 space-y-2.5">
                {historySeed && (
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-energy/10">
                    <History className="h-3 w-3 text-energy-ink shrink-0 mt-0.5" />
                    {whyText}
                  </p>
                )}
                <select
                  value={selectedVariation}
                  onChange={(e) => { touchedRef.current = true; setSelectedVariation(e.target.value); }}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
                >
                  {pattern.variations.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  value={startingLoad}
                  onChange={(e) => { touchedRef.current = true; setStartingLoad(e.target.value); }}
                  placeholder="Starting load (kg)"
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm tabular-nums"
                />
                <button
                  onClick={() => startPattern.mutate({
                    patternKey: pattern.key,
                    variationName: selectedVariation,
                    startingLoad: parseFloat(startingLoad) || 0,
                    repRangeLow: 6,
                    repRangeHigh: 12,
                  })}
                  disabled={startPattern.isPending}
                  className="w-full py-2 rounded-xl bg-foreground text-background text-sm font-bold disabled:opacity-50"
                >
                  {historySeed ? 'Confirm and start' : 'Start lifecycle'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between text-left gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-semibold truncate">{pattern.name}</div>
            {endTrigger && <AlertTriangle className="h-3.5 w-3.5 text-fuel-ink shrink-0" />}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{activeLifecycle.variation_name}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sessionTargets && (
            <div className="text-right">
              <div className="text-xs font-bold tabular-nums">{sessionTargets.leading.load}kg × {sessionTargets.leading.reps}</div>
              <div className="text-[10px] text-muted-foreground">leading</div>
            </div>
          )}
          <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3 space-y-3">
              <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <Sparkles className="h-3 w-3 text-energy-ink shrink-0 mt-0.5" />
                {whyText}
              </p>

              {openWeakPoint && (
                <div className="text-[11px] px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive font-medium">
                  Weak point being addressed: {openWeakPoint}
                </div>
              )}

              {endTrigger && (
                <div className="p-2.5 rounded-lg bg-fuel/10 border border-fuel/30 space-y-2">
                  <div className="text-xs font-semibold text-fuel-ink">{END_TRIGGER_LABEL[endTrigger.type]}</div>
                  <p className="text-[11px] text-muted-foreground">{endTrigger.detail} Time to rotate variations.</p>
                  <button
                    onClick={() => rotateVariation.mutate({ patternKey: pattern.key, endTrigger: endTrigger.type })}
                    disabled={rotateVariation.isPending}
                    className="w-full py-1.5 rounded-lg bg-fuel text-fuel-foreground text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Rotate to next variation
                  </button>
                </div>
              )}

              {sessionTargets && (
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Leading</div>
                    <div className="text-sm font-bold tabular-nums">{sessionTargets.leading.load}kg × {sessionTargets.leading.reps}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Back-off</div>
                    <div className="text-sm font-bold tabular-nums">{sessionTargets.backoff.load}kg × {sessionTargets.backoff.reps}</div>
                  </div>
                </div>
              )}

              {/* Regular vs Adaptive — informational choice only; doesn't alter the regular programming engine's output. */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Following today</div>
                <div className="flex rounded-lg bg-muted p-0.5">
                  {(['regular', 'adaptive'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setChoice(opt)}
                      className={cn(
                        'flex-1 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors',
                        choice === opt ? 'bg-background shadow-sm' : 'text-muted-foreground'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {choice === 'adaptive' && sessionTargets && (
                <FormBreakdownLogger
                  defaultLeadingLoad={sessionTargets.leading.load}
                  defaultLeadingReps={sessionTargets.leading.reps}
                  defaultBackoffLoad={sessionTargets.backoff.load ?? defaultBackoffLoad(sessionTargets.leading.load)}
                  defaultBackoffReps={sessionTargets.backoff.reps}
                  submitting={logSession.isPending}
                  onSubmit={(values) => logSession.mutate({ lifecycleId: activeLifecycle.id, ...values })}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Adaptive Mode's surface on the Today/workout-split screen: per movement
 * pattern, shows the active variation + why, today's leading/back-off
 * targets, and an end-trigger prompt to rotate when one has fired — sitting
 * alongside (not replacing) the regular programmed workout, so the user can
 * compare both and choose which to follow that session.
 */
export function AdaptiveSuggestionsCard() {
  const { patternStates, isLoading } = useAdaptiveMode();

  if (isLoading) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles className="h-4 w-4 text-energy-ink" />
        <div className="text-sm font-bold">Adaptive suggestions</div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Infinite Progression rotation, alongside your regular programming — pick which to follow per pattern.
      </p>
      <div className="space-y-2">
        {patternStates.map(state => (
          <PatternRow key={state.pattern.key} state={state} />
        ))}
      </div>
    </div>
  );
}
