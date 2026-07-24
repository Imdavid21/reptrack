import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useExerciseSets } from './useExerciseSets';
import { localDateKey } from '@/lib/dateKey';
import {
  MOVEMENT_PATTERNS,
  MOVEMENT_PATTERN_LIST,
  MovementPatternKey,
  MovementPatternDef,
  getVariation,
  detectPatternSeed,
} from '@/lib/adaptiveRoster';
import {
  LifecycleRecord,
  SessionLogEntry,
  DEFAULT_ADAPTIVE_CONFIG,
  checkEndTrigger,
  detectOpenWeakPoint,
  computeCarryoverOut,
  computeCarryoverTotal,
  deriveConversionFactor,
  computeNewStartingLoad,
  computeSessionTargets,
  selectNextVariation,
  isResensitised,
  SessionTargets,
  EndTriggerResult,
} from '@/lib/adaptiveEngine';
import { StrengthZone } from '@/lib/adaptiveRoster';

export interface AdaptivePatternState {
  pattern: MovementPatternDef;
  activeLifecycle: LifecycleRecord | null;
  sessions: SessionLogEntry[];
  carryoverTotal: number;
  endTrigger: EndTriggerResult | null;
  openWeakPoint: StrengthZone | null;
  sessionTargets: SessionTargets | null;
  /** Human-readable "why this variation" explanation, shown on the workout split. */
  whyText: string;
}

/**
 * Adaptive Mode data layer — fetches this user's lifecycle + session history
 * and runs it through the pure decision engine (adaptiveEngine.ts) to answer,
 * per movement pattern: which variation is active and why, today's leading/
 * back-off targets, whether it's time to rotate, and what weak point (if any)
 * is being addressed. See src/lib/adaptiveEngine.ts for the actual logic.
 */
export function useAdaptiveMode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: lifecycles = [], isLoading: loadingLifecycles } = useQuery({
    queryKey: ['adaptive-lifecycles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('adaptive_lifecycles')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as LifecycleRecord[];
    },
    enabled: !!user,
  });

  const { data: sessionLogs = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['adaptive-session-logs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('adaptive_session_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('session_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as (SessionLogEntry & { id: string; lifecycle_id: string })[];
    },
    enabled: !!user,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['adaptive-lifecycles', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['adaptive-session-logs', user?.id] });
  };

  /** Starts the very first lifecycle for a pattern (no prior history). */
  const startPattern = useMutation({
    mutationFn: async (args: {
      patternKey: MovementPatternKey;
      variationName: string;
      startingLoad: number;
      repRangeLow: number;
      repRangeHigh: number;
    }) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('adaptive_lifecycles').insert({
        user_id: user.id,
        movement_pattern: args.patternKey,
        variation_name: args.variationName,
        rep_range_low: args.repRangeLow,
        rep_range_high: args.repRangeHigh,
        starting_load: args.startingLoad,
        carryover_in: 0,
        status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Seed each pattern's first lifecycle from already-logged workout history
  // instead of requiring a blank manual entry: the first time a pattern has
  // no lifecycle at all (never started, not just "no active one"), look for
  // a matching exercise in the user's own set history and auto-start from
  // their most recent heaviest set on it. Patterns with no matching history
  // fall back to the manual "Start lifecycle" form in AdaptiveSuggestionsCard.
  const { data: exerciseSetsData, isLoading: loadingExerciseSets } = useExerciseSets();
  const attemptedBackfill = useRef<Set<MovementPatternKey>>(new Set());

  useEffect(() => {
    if (loadingLifecycles || loadingExerciseSets || !exerciseSetsData) return;
    for (const pattern of MOVEMENT_PATTERN_LIST) {
      const everStarted = lifecycles.some(l => l.movement_pattern === pattern.key);
      if (everStarted || attemptedBackfill.current.has(pattern.key)) continue;
      attemptedBackfill.current.add(pattern.key);

      const seed = detectPatternSeed(pattern.key, exerciseSetsData.sets);
      if (!seed) continue;
      startPattern.mutate({
        patternKey: pattern.key,
        variationName: seed.variationName,
        startingLoad: seed.startingLoad,
        repRangeLow: 6,
        repRangeHigh: 12,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingLifecycles, loadingExerciseSets, exerciseSetsData, lifecycles]);

  /** Logs one session's leading + back-off performance (and optional weak-point tag) against the active lifecycle. */
  const logSession = useMutation({
    mutationFn: async (args: {
      lifecycleId: string;
      leadingLoad: number;
      leadingReps: number;
      backoffLoad?: number | null;
      backoffReps?: number | null;
      weakPointZone?: StrengthZone | null;
      formNote?: string | null;
    }) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase.from('adaptive_session_logs').insert({
        user_id: user.id,
        lifecycle_id: args.lifecycleId,
        session_date: localDateKey(),
        leading_load: args.leadingLoad,
        leading_reps: args.leadingReps,
        backoff_load: args.backoffLoad ?? null,
        backoff_reps: args.backoffReps ?? null,
        weak_point_zone: args.weakPointZone ?? null,
        form_note: args.formNote ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Closes the active lifecycle for a pattern and rotates to the next
   * variation, applying the full carryover_out → carryover_total → new
   * starting-load chain from Section 3 of the spec.
   */
  const rotateVariation = useMutation({
    mutationFn: async (args: { patternKey: MovementPatternKey; endTrigger: string }) => {
      if (!user) throw new Error('No user');
      const pattern = MOVEMENT_PATTERNS[args.patternKey];
      const active = lifecycles.find(l => l.movement_pattern === args.patternKey && l.status === 'active');
      if (!active) throw new Error('No active lifecycle to rotate');

      const sessions = sessionLogs.filter(s => (s as unknown as { lifecycle_id: string }).lifecycle_id === active.id);
      const lastSession = [...sessions].sort((a, b) => a.session_date.localeCompare(b.session_date)).at(-1);
      const endingLoad = lastSession?.leading_load ?? active.starting_load ?? 0;
      const carryoverOut = computeCarryoverOut(active.starting_load, endingLoad);
      const openWeakPoint = detectOpenWeakPoint(sessions);

      // Close the current lifecycle.
      const { error: closeError } = await supabase
        .from('adaptive_lifecycles')
        .update({
          end_date: localDateKey(),
          ending_load: endingLoad,
          carryover_out: carryoverOut,
          end_trigger: args.endTrigger,
          status: 'closed',
          weak_points_targeted: openWeakPoint ? [openWeakPoint] : [],
        })
        .eq('id', active.id);
      if (closeError) throw closeError;

      // Select the next variation: weak-point-matched, else longest-unused.
      const closedLifecyclesAfterThis = lifecycles.map(l => (l.id === active.id
        ? { ...l, status: 'closed' as const, carryover_out: carryoverOut, ending_load: endingLoad, end_date: localDateKey() }
        : l));
      const candidates = pattern.variations.map(v => {
        const past = closedLifecyclesAfterThis
          .filter(l => l.movement_pattern === pattern.key && l.variation_name === v.name && l.status === 'closed')
          .sort((a, b) => (a.end_date ?? '').localeCompare(b.end_date ?? ''));
        return {
          variation: v,
          lastActiveEndDate: past.at(-1)?.end_date ?? null,
          resensitising: !isResensitised(v.name, closedLifecyclesAfterThis, pattern.key, DEFAULT_ADAPTIVE_CONFIG),
        };
      });
      const selection = selectNextVariation(pattern, candidates, active.variation_name, openWeakPoint);

      const carryoverTotal = computeCarryoverTotal(closedLifecyclesAfterThis, pattern.key);
      const currentCurve = getVariation(pattern.key, active.variation_name)?.curve;
      const nextCurve = selection.variation.curve;
      const conversionFactor = currentCurve ? deriveConversionFactor(currentCurve, nextCurve) : 1;
      // The new variation's own last-known starting point in this pattern, if
      // it's run before; 0 if it's never been trained (see spec Section 3.5 —
      // a resensitised variation's new floor is the full carryover_total, not
      // where it personally left off).
      const ownBaseline = closedLifecyclesAfterThis
        .filter(l => l.movement_pattern === pattern.key && l.variation_name === selection.variation.name)
        .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))[0]?.starting_load ?? 0;
      const newStartingLoad = computeNewStartingLoad(ownBaseline, carryoverTotal, conversionFactor);

      const { error: insertError } = await supabase.from('adaptive_lifecycles').insert({
        user_id: user.id,
        movement_pattern: pattern.key,
        variation_name: selection.variation.name,
        rep_range_low: active.rep_range_low,
        rep_range_high: active.rep_range_high,
        starting_load: newStartingLoad,
        carryover_in: carryoverTotal,
        status: 'active',
        weak_points_targeted: openWeakPoint ? [openWeakPoint] : [],
      });
      if (insertError) throw insertError;

      return { selection, newStartingLoad, carryoverTotal };
    },
    onSuccess: invalidate,
  });

  const patternStates: AdaptivePatternState[] = useMemo(() => {
    return MOVEMENT_PATTERN_LIST.map((pattern) => {
      const active = lifecycles.find(l => l.movement_pattern === pattern.key && l.status === 'active') ?? null;
      const sessions = active
        ? sessionLogs.filter(s => (s as unknown as { lifecycle_id: string }).lifecycle_id === active.id)
        : [];
      const carryoverTotal = computeCarryoverTotal(lifecycles, pattern.key);
      const endTrigger = active ? checkEndTrigger(active, sessions, DEFAULT_ADAPTIVE_CONFIG) : null;
      const openWeakPoint = detectOpenWeakPoint(sessions);
      const lastSession = sessions.length > 0
        ? [...sessions].sort((a, b) => a.session_date.localeCompare(b.session_date)).at(-1)!
        : null;
      const sessionTargets = active
        ? computeSessionTargets(lastSession, active.rep_range_low, active.rep_range_high, active.starting_load ?? 0)
        : null;

      let whyText = 'Not started yet — pick a variation to begin this pattern\'s first lifecycle.';
      if (active) {
        if (active.carryover_in > 0) {
          whyText = `${active.variation_name} — carrying forward ${active.carryover_in}kg of accumulated ${pattern.name.toLowerCase()} strength from prior lifecycles.`;
        } else {
          whyText = `${active.variation_name} — this pattern's first tracked lifecycle.`;
        }
        if (active.weak_points_targeted?.length) {
          whyText += ` Targeting the ${active.weak_points_targeted[0]} weak point flagged last lifecycle.`;
        }
      }

      return { pattern, activeLifecycle: active, sessions, carryoverTotal, endTrigger, openWeakPoint, sessionTargets, whyText };
    });
  }, [lifecycles, sessionLogs]);

  return {
    isLoading: loadingLifecycles || loadingSessions,
    lifecycles,
    sessionLogs,
    patternStates,
    startPattern,
    logSession,
    rotateVariation,
  };
}
