import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WaterReminderConfig {
  id: string;
  user_id: string;
  telegram_username: string;
  telegram_chat_id: string | null;
  frequency_minutes: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useWaterReminderConfig() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['waterReminderConfig', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('water_reminder_configs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as WaterReminderConfig | null;
    },
    enabled: !!user,
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (config: {
      telegram_username: string;
      frequency_minutes: number;
      start_time: string;
      end_time: string;
      is_active: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('water_reminder_configs')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('water_reminder_configs')
          .update({
            ...config,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('water_reminder_configs')
          .insert({
            user_id: user.id,
            ...config,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waterReminderConfig'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('water_reminder_configs')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
      return isActive;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waterReminderConfig'] });
    },
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    saveConfig: saveConfigMutation.mutateAsync,
    isSaving: saveConfigMutation.isPending,
    toggleActive: toggleActiveMutation.mutateAsync,
    isToggling: toggleActiveMutation.isPending,
  };
}
