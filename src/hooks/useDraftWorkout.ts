import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorkoutExercise, Habits } from './useWorkouts';
import { useAuth } from './useAuth';

export interface DraftWorkout {
  day: string;
  dayName: string;
  date: string;
  weekNumber: number;
  exercises: WorkoutExercise[];
  habits: Habits;
  currentExerciseIndex: number;
  currentSetIndex: number;
  step: 'select-day' | 'review' | 'exercises';
  lastSavedAt: string;
  workoutStartTime?: string;
  manualStart?: string;
  manualDuration?: number;
  saveId?: string;
  resumePath?: string;
  elapsedSeconds?: number;
  pausedSeconds?: number;
  pauseStartedAt?: string;
  pauseIntervals?: Array<{ pausedAt: string; resumedAt?: string }>;
  version?: number;
}

const DRAFT_KEY = 'fittrack_draft_workout';
const MAX_AGE = 7 * 24 * 3_600_000;
const keyFor = (userId: string) => `${DRAFT_KEY}_${userId}`;
const hasSets = (draft: DraftWorkout) => draft.exercises?.some(ex => ex.sets?.some(set => set.completed)) ?? false;
const fresh = (draft: DraftWorkout) => {
  const stamp = new Date(draft.lastSavedAt).getTime();
  return Number.isFinite(stamp) && stamp <= Date.now() + 300_000 && Date.now() - stamp < MAX_AGE;
};

export function draftDateKey(draft: DraftWorkout): string {
  const parsed = draft.date ? new Date(draft.date) : new Date();
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function isResumableDraft(draft: DraftWorkout | null | undefined): boolean {
  return !!draft && Array.isArray(draft.exercises) && draft.exercises.length > 0 && draft.step !== 'select-day' && hasSets(draft) && fresh(draft);
}

export function recoveryConflict(local: DraftWorkout | null, cloud: DraftWorkout | null): boolean {
  if (!local || !cloud || !isResumableDraft(local) || !isResumableDraft(cloud)) return false;
  return local.saveId !== cloud.saveId || JSON.stringify(local.exercises) !== JSON.stringify(cloud.exercises);
}

// One queue per account prevents an older, slower request from overtaking a newer snapshot.
const queues = new Map<string, Promise<void>>();
function enqueue(userId: string, task: () => Promise<void>) {
  const previous = queues.get(userId) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  queues.set(userId, next);
  void next.finally(() => { if (queues.get(userId) === next) queues.delete(userId); }).catch(() => {});
  return next;
}

export function useDraftWorkout() {
  const { user, loading: authLoading } = useAuth();
  const [draft, setDraft] = useState<DraftWorkout | null>(null);
  const [cloudDraft, setCloudDraft] = useState<DraftWorkout | null>(null);
  const [conflict, setConflict] = useState<{ local: DraftWorkout; cloud: DraftWorkout } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'checking' | 'device' | 'synced'>('checking');
  const pendingSaveRef = useRef<DraftWorkout | null>(null);
  const currentRef = useRef<DraftWorkout | null>(null);
  const readyRef = useRef(false);
  const blockedRef = useRef(false);
  const closedRef = useRef(false);

  const publish = useCallback((snapshot: DraftWorkout) => {
    if (!user || !readyRef.current || blockedRef.current || closedRef.current || !navigator.onLine || !hasSets(snapshot)) return;
    const saveId = snapshot.saveId;
    if (!saveId) return;
    void enqueue(user.id, async () => {
      if (closedRef.current || blockedRef.current || currentRef.current?.saveId !== saveId) return;
      const { error } = await supabase.rpc('save_workout_recovery', {
        p_save_id: saveId, p_snapshot: snapshot as unknown as import('@/integrations/supabase/types').Json, p_saved_at: snapshot.lastSavedAt,
      });
      if (error) { console.warn('[workout-recovery] account save failed', error.message); setSyncStatus('device'); }
      else if (!closedRef.current && currentRef.current?.lastSavedAt === snapshot.lastSavedAt) setSyncStatus('synced');
    });
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoaded(true); return; }
    let cancelled = false;
    readyRef.current = false;
    closedRef.current = false;
    setLoaded(false);
    setSyncStatus('checking');
    const key = keyFor(user.id);
    let local: DraftWorkout | null = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftWorkout;
        if (fresh(parsed)) local = parsed;
        else localStorage.removeItem(key);
      }
    } catch { localStorage.removeItem(key); }
    currentRef.current = local;
    pendingSaveRef.current = local;
    setDraft(local);
    const load = async () => {
      const { data, error } = await supabase.from('workout_recovery_snapshots').select('save_id,snapshot,status').eq('user_id', user.id).maybeSingle();
      if (cancelled) return;
      if (error) { console.warn('[workout-recovery] account load failed', error.message); readyRef.current = true; setSyncStatus('device'); setLoaded(true); return; }
      const remote = data?.status === 'active' ? data.snapshot as unknown as DraftWorkout : null;
      const cloud = remote && fresh(remote) && remote.saveId === data?.save_id ? remote : null;
      // A completed workout must never be resurrected by a leftover recovery copy.
      if (cloud?.saveId) {
        const { data: finished, error: lookupError } = await supabase.from('workouts').select('id').eq('id', cloud.saveId).eq('user_id', user.id).limit(1).maybeSingle();
        if (cancelled) return;
        if (lookupError) { console.warn('[workout-recovery] finish lookup failed', lookupError.message); readyRef.current = true; setSyncStatus('device'); setLoaded(true); return; }
        if (finished) { void supabase.rpc('close_workout_recovery', { p_save_id: cloud.saveId }); readyRef.current = true; setSyncStatus('device'); setLoaded(true); return; }
      }
      setCloudDraft(cloud);
      const latestLocal = currentRef.current;
      if (recoveryConflict(latestLocal, cloud) && cloud && latestLocal) {
        blockedRef.current = true;
        setConflict({ local: latestLocal, cloud });
        setSyncStatus('device');
      } else if (cloud && (!latestLocal || new Date(cloud.lastSavedAt).getTime() > new Date(latestLocal.lastSavedAt).getTime())) {
        currentRef.current = cloud;
        pendingSaveRef.current = cloud;
        localStorage.setItem(key, JSON.stringify(cloud));
        setDraft(cloud);
        setSyncStatus('synced');
      } else if (latestLocal && cloud && latestLocal.lastSavedAt === cloud.lastSavedAt) setSyncStatus('synced');
      else setSyncStatus('device');
      readyRef.current = true;
      setLoaded(true);
      if (!blockedRef.current && latestLocal && (!cloud || latestLocal.lastSavedAt > cloud.lastSavedAt)) publish(latestLocal);
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id, authLoading, publish]);

  useEffect(() => {
    if (!user) return;
    const flush = () => {
      if (!pendingSaveRef.current) return;
      try { localStorage.setItem(keyFor(user.id), JSON.stringify(pendingSaveRef.current)); }
      catch (error) { console.error('[workout-recovery] device save failed', error); }
    };
    const visible = () => { if (document.visibilityState === 'hidden') flush(); else if (navigator.onLine && currentRef.current) publish(currentRef.current); };
    const online = () => { if (currentRef.current) publish(currentRef.current); };
    const beforeUnload = (event: BeforeUnloadEvent) => { flush(); if (pendingSaveRef.current?.step === 'exercises') { event.preventDefault(); event.returnValue = ''; } };
    const timer = window.setInterval(flush, 5000);
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('online', online);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('online', online); };
  }, [user?.id, publish]);

  const saveDraft = useCallback((data: Omit<DraftWorkout, 'lastSavedAt'>) => {
    if (!user || closedRef.current) return;
    const snapshot: DraftWorkout = { ...data, saveId: data.saveId || currentRef.current?.saveId || crypto.randomUUID(), currentSetIndex: data.currentSetIndex ?? 0, version: 1, lastSavedAt: new Date().toISOString() };
    currentRef.current = snapshot;
    pendingSaveRef.current = snapshot;
    setDraft(snapshot);
    setSyncStatus('device');
    try { localStorage.setItem(keyFor(user.id), JSON.stringify(snapshot)); }
    catch (error) { console.error('[workout-recovery] device save failed', error); }
    publish(snapshot);
  }, [user, publish]);

  const chooseDraft = useCallback((source: 'device' | 'account') => {
    if (!conflict || !user) return;
    const chosen = source === 'device' ? conflict.local : conflict.cloud;
    blockedRef.current = false;
    currentRef.current = chosen;
    pendingSaveRef.current = chosen;
    localStorage.setItem(keyFor(user.id), JSON.stringify(chosen));
    setDraft(chosen);
    setCloudDraft(source === 'account' ? chosen : cloudDraft);
    setConflict(null);
    setSyncStatus(source === 'account' ? 'synced' : 'device');
    if (source === 'device') publish(chosen);
  }, [conflict, user, publish, cloudDraft]);

  const clearDraft = useCallback(async () => {
    if (!user) return;
    const saveId = currentRef.current?.saveId;
    closedRef.current = true;
    blockedRef.current = false;
    if (saveId && navigator.onLine) {
      // Close after queued writes, so a delayed save cannot recreate the session.
      const previous = queues.get(user.id);
      if (previous) await previous.catch(() => {});
      const { error } = await supabase.rpc('close_workout_recovery', { p_save_id: saveId });
      if (error) console.warn('[workout-recovery] account close failed', error.message);
    }
    localStorage.removeItem(keyFor(user.id));
    setDraft(null);
    setCloudDraft(null);
    setConflict(null);
    pendingSaveRef.current = null;
    currentRef.current = null;
  }, [user]);

  return { draft, cloudDraft, conflict, chooseDraft, syncStatus, resumable: isResumableDraft(draft), loaded, saveDraft, clearDraft, hasProgress: draft ? hasSets(draft) : false };
}
