import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface BloodPressureReading {
  id: string;
  user_id: string;
  measured_at: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  notes: string | null;
  created_at: string;
}

export interface BloodSugarReading {
  id: string;
  user_id: string;
  measured_at: string;
  glucose_level: number;
  reading_type: 'fasting' | 'post_meal' | 'random';
  notes: string | null;
  created_at: string;
}

export function useBloodPressureReadings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bloodPressure', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('blood_pressure_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(52); // ~1 year of weekly readings

      if (error) throw error;
      return data as BloodPressureReading[];
    },
    enabled: !!user,
  });

  const addReading = useMutation({
    mutationFn: async (reading: { systolic: number; diastolic: number; pulse?: number; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('blood_pressure_readings')
        .insert({
          user_id: user.id,
          ...reading,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloodPressure'] });
    },
  });

  const latestReading = query.data?.[0] || null;
  const weeksSinceLastReading = latestReading
    ? Math.floor((Date.now() - new Date(latestReading.measured_at).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : null;

  return {
    readings: query.data ?? [],
    latestReading,
    weeksSinceLastReading,
    isLoading: query.isLoading,
    addReading: addReading.mutateAsync,
    isAdding: addReading.isPending,
  };
}

export function useBloodSugarReadings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bloodSugar', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('blood_sugar_readings')
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(24); // ~2 years of monthly readings

      if (error) throw error;
      return data as BloodSugarReading[];
    },
    enabled: !!user,
  });

  const addReading = useMutation({
    mutationFn: async (reading: { glucose_level: number; reading_type?: 'fasting' | 'post_meal' | 'random'; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('blood_sugar_readings')
        .insert({
          user_id: user.id,
          ...reading,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloodSugar'] });
    },
  });

  const latestReading = query.data?.[0] || null;
  const monthsSinceLastReading = latestReading
    ? Math.floor((Date.now() - new Date(latestReading.measured_at).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : null;

  return {
    readings: query.data ?? [],
    latestReading,
    monthsSinceLastReading,
    isLoading: query.isLoading,
    addReading: addReading.mutateAsync,
    isAdding: addReading.isPending,
  };
}
