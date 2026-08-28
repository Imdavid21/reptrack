/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { localDateKey } from '@/lib/dateKey';

export interface AdvancedSettings { enabled: boolean; specializationMuscles: string[]; sessionVolumeModifier: number; }
export interface GymProfile { id: string; name: string; barWeightKg: number; platesKg: number[]; isDefault: boolean; }
export interface TrainingBlock { id: string; name: string; focus: string | null; startsOn: string; endsOn: string | null; status: 'planned' | 'active' | 'completed'; }
export interface TrainingExperiment { id: string; name: string; metric: string; baseline: number | null; target: number | null; startsOn: string; endsOn: string | null; status: 'planned' | 'active' | 'completed' | 'cancelled'; }

const DEFAULT_SETTINGS: AdvancedSettings = { enabled: false, specializationMuscles: [], sessionVolumeModifier: 1 };
const table = (name: string) => (supabase.from(name as any) as any);

export function useAdvancedMode() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ['advanced-settings', user?.id];

  const settingsQuery = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async (): Promise<AdvancedSettings> => {
      if (!user) return DEFAULT_SETTINGS;
      const { data, error } = await table('advanced_settings').select('enabled,specialization_muscles,session_volume_modifier').eq('user_id', user.id).maybeSingle();
      if (error) {
        if (error.code === 'PGRST205' || /advanced_settings.*schema cache/i.test(error.message || '')) return DEFAULT_SETTINGS;
        throw error;
      }
      if (!data) return DEFAULT_SETTINGS;
      return { enabled: Boolean(data.enabled), specializationMuscles: Array.isArray(data.specialization_muscles) ? data.specialization_muscles : [], sessionVolumeModifier: Number(data.session_volume_modifier) || 1 };
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<AdvancedSettings>) => {
      if (!user) throw new Error('Not authenticated');
      const current = settingsQuery.data ?? DEFAULT_SETTINGS;
      const row = { user_id: user.id, enabled: patch.enabled ?? current.enabled, specialization_muscles: patch.specializationMuscles ?? current.specializationMuscles, session_volume_modifier: patch.sessionVolumeModifier ?? current.sessionVolumeModifier, updated_at: new Date().toISOString() };
      const { data, error } = await table('advanced_settings').upsert(row, { onConflict: 'user_id' }).select().single();
      if (error) throw error;
      return { enabled: Boolean(data.enabled), specializationMuscles: Array.isArray(data.specialization_muscles) ? data.specialization_muscles : [], sessionVolumeModifier: Number(data.session_volume_modifier) || 1 } as AdvancedSettings;
    },
    onSuccess: data => queryClient.setQueryData(key, data),
  });

  return { settings: settingsQuery.data ?? DEFAULT_SETTINGS, isLoading: settingsQuery.isLoading, error: settingsQuery.error, save, setEnabled: (enabled: boolean) => save.mutateAsync({ enabled }) };
}

export function useAdvancedLabData(enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canRead = !!user && enabled;

  const gyms = useQuery({
    queryKey: ['gym-profiles', user?.id], enabled: canRead,
    queryFn: async (): Promise<GymProfile[]> => {
      const { data, error } = await table('gym_profiles').select('id,name,bar_weight_kg,plates_kg,is_default').eq('user_id', user!.id).order('is_default', { ascending: false }).order('name');
      if (error) throw error;
      return (data || []).map((row: any) => ({ id: row.id, name: row.name, barWeightKg: Number(row.bar_weight_kg), platesKg: (row.plates_kg || []).map(Number), isDefault: Boolean(row.is_default) }));
    },
  });

  const blocks = useQuery({
    queryKey: ['training-blocks', user?.id], enabled: canRead,
    queryFn: async (): Promise<TrainingBlock[]> => {
      const { data, error } = await table('training_blocks').select('id,name,focus,starts_on,ends_on,status').eq('user_id', user!.id).order('starts_on', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({ id: row.id, name: row.name, focus: row.focus, startsOn: row.starts_on, endsOn: row.ends_on, status: row.status }));
    },
  });

  const experiments = useQuery({
    queryKey: ['training-experiments', user?.id], enabled: canRead,
    queryFn: async (): Promise<TrainingExperiment[]> => {
      const { data, error } = await table('training_experiments').select('id,name,metric,baseline,target,starts_on,ends_on,status').eq('user_id', user!.id).order('starts_on', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({ id: row.id, name: row.name, metric: row.metric, baseline: row.baseline == null ? null : Number(row.baseline), target: row.target == null ? null : Number(row.target), startsOn: row.starts_on, endsOn: row.ends_on, status: row.status }));
    },
  });

  const saveGym = useMutation({
    mutationFn: async (input: Partial<GymProfile> & { name: string }) => {
      if (!user) throw new Error('Not authenticated');
      const row = { user_id: user.id, name: input.name.trim(), bar_weight_kg: input.barWeightKg ?? 20, plates_kg: input.platesKg ?? [25,20,15,10,5,2.5,1.25], is_default: input.isDefault ?? false, updated_at: new Date().toISOString() };
      const query = input.id ? table('gym_profiles').update(row).eq('id', input.id).eq('user_id', user.id) : table('gym_profiles').insert(row);
      const { data, error } = await query.select('id').single();
      if (error) throw error;
      const savedId = data.id;
      if (input.isDefault) {
        const { error: clearError } = await table('gym_profiles').update({ is_default: false, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_default', true).neq('id', savedId);
        if (clearError) throw clearError;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gym-profiles', user?.id] }),
  });

  const saveBlock = useMutation({
    mutationFn: async (input: Partial<TrainingBlock> & { name: string }) => {
      if (!user) throw new Error('Not authenticated');
      const status = input.status ?? 'active';
      const row = { user_id: user.id, name: input.name.trim(), focus: input.focus ?? null, starts_on: input.startsOn ?? localDateKey(), ends_on: input.endsOn ?? null, status, updated_at: new Date().toISOString() };
      const query = input.id ? table('training_blocks').update(row).eq('id', input.id).eq('user_id', user.id) : table('training_blocks').insert(row);
      const { data, error } = await query.select('id').single();
      if (error) throw error;
      const savedId = data.id;
      if (status === 'active') {
        const { error: closeError } = await table('training_blocks').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('status', 'active').neq('id', savedId);
        if (closeError) throw closeError;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training-blocks', user?.id] }),
  });

  const saveExperiment = useMutation({
    mutationFn: async (input: Partial<TrainingExperiment> & { name: string; metric: string }) => {
      if (!user) throw new Error('Not authenticated');
      const row = { user_id: user.id, name: input.name.trim(), metric: input.metric.trim(), baseline: input.baseline ?? null, target: input.target ?? null, starts_on: input.startsOn ?? localDateKey(), ends_on: input.endsOn ?? null, status: input.status ?? 'active', updated_at: new Date().toISOString() };
      const query = input.id ? table('training_experiments').update(row).eq('id', input.id).eq('user_id', user.id) : table('training_experiments').insert(row);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training-experiments', user?.id] }),
  });

  return {
    gyms: gyms.data ?? [], blocks: blocks.data ?? [], experiments: experiments.data ?? [],
    isLoading: gyms.isLoading || blocks.isLoading || experiments.isLoading,
    error: gyms.error || blocks.error || experiments.error || null,
    saveGym, saveBlock, saveExperiment,
  };
}

export async function enqueueCoachEvent(userId: string, eventType: string, payload: Record<string, unknown>, dedupeKey?: string) {
  const row = { user_id: userId, event_type: eventType, event_date: localDateKey(), payload, dedupe_key: dedupeKey ?? null };
  const query = dedupeKey ? table('coach_events').upsert(row, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true }) : table('coach_events').insert(row);
  const { error } = await query;
  if (error) throw error;
}
