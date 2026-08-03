export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adaptive_lifecycles: {
        Row: {
          carryover_in: number
          carryover_out: number | null
          created_at: string
          end_date: string | null
          end_trigger: string | null
          ending_load: number | null
          id: string
          movement_pattern: string
          phase_modifier: string | null
          rep_range_high: number
          rep_range_low: number
          start_date: string
          starting_load: number | null
          status: string
          updated_at: string
          user_id: string
          variation_name: string
          weak_points_targeted: string[]
        }
        Insert: {
          carryover_in?: number
          carryover_out?: number | null
          created_at?: string
          end_date?: string | null
          end_trigger?: string | null
          ending_load?: number | null
          id?: string
          movement_pattern: string
          phase_modifier?: string | null
          rep_range_high: number
          rep_range_low: number
          start_date?: string
          starting_load?: number | null
          status?: string
          updated_at?: string
          user_id: string
          variation_name: string
          weak_points_targeted?: string[]
        }
        Update: {
          carryover_in?: number
          carryover_out?: number | null
          created_at?: string
          end_date?: string | null
          end_trigger?: string | null
          ending_load?: number | null
          id?: string
          movement_pattern?: string
          phase_modifier?: string | null
          rep_range_high?: number
          rep_range_low?: number
          start_date?: string
          starting_load?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          variation_name?: string
          weak_points_targeted?: string[]
        }
        Relationships: []
      }
      adaptive_session_logs: {
        Row: {
          backoff_load: number | null
          backoff_reps: number | null
          created_at: string
          form_note: string | null
          id: string
          leading_load: number
          leading_reps: number
          lifecycle_id: string
          session_date: string
          user_id: string
          weak_point_zone: string | null
        }
        Insert: {
          backoff_load?: number | null
          backoff_reps?: number | null
          created_at?: string
          form_note?: string | null
          id?: string
          leading_load: number
          leading_reps: number
          lifecycle_id: string
          session_date?: string
          user_id: string
          weak_point_zone?: string | null
        }
        Update: {
          backoff_load?: number | null
          backoff_reps?: number | null
          created_at?: string
          form_note?: string | null
          id?: string
          leading_load?: number
          leading_reps?: number
          lifecycle_id?: string
          session_date?: string
          user_id?: string
          weak_point_zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adaptive_session_logs_lifecycle_id_fkey"
            columns: ["lifecycle_id"]
            isOneToOne: false
            referencedRelation: "adaptive_lifecycles"
            referencedColumns: ["id"]
          },
        ]
      }
      calorie_burns: {
        Row: {
          activity_type: string | null
          calories: number
          created_at: string | null
          date: string
          distance_km: number | null
          duration_minutes: number | null
          id: string
          source: string
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          calories: number
          created_at?: string | null
          date?: string
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          source: string
          user_id: string
        }
        Update: {
          activity_type?: string | null
          calories?: number
          created_at?: string | null
          date?: string
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_routines: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          routine_data: Json
          routine_name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          routine_data: Json
          routine_name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          routine_data?: Json
          routine_name?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          bodyweight: number | null
          created_at: string | null
          date: string
          energy_level: number | null
          id: string
          is_rest_day: boolean | null
          notes: string | null
          pullups: number | null
          sleep_hours: number | null
          supplements: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bodyweight?: number | null
          created_at?: string | null
          date: string
          energy_level?: number | null
          id?: string
          is_rest_day?: boolean | null
          notes?: string | null
          pullups?: number | null
          sleep_hours?: number | null
          supplements?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bodyweight?: number | null
          created_at?: string | null
          date?: string
          energy_level?: number | null
          id?: string
          is_rest_day?: boolean | null
          notes?: string | null
          pullups?: number | null
          sleep_hours?: number | null
          supplements?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deload_weeks: {
        Row: {
          completed: boolean | null
          created_at: string | null
          fatigue_indicators: Json | null
          id: string
          intensity_reduction_percent: number | null
          notes: string | null
          trigger_reason: string
          user_id: string
          volume_reduction_percent: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          fatigue_indicators?: Json | null
          id?: string
          intensity_reduction_percent?: number | null
          notes?: string | null
          trigger_reason: string
          user_id: string
          volume_reduction_percent?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          fatigue_indicators?: Json | null
          id?: string
          intensity_reduction_percent?: number | null
          notes?: string | null
          trigger_reason?: string
          user_id?: string
          volume_reduction_percent?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          actual_reps: number | null
          actual_weight: number | null
          completed: boolean | null
          created_at: string | null
          exercise_category: string
          exercise_name: string
          id: string
          movement_pattern: string | null
          primary_muscles: string[] | null
          set_number: number
          target_reps: number | null
          target_weight: number | null
          template_id: string | null
          template_snapshot: Json | null
          workout_id: string
        }
        Insert: {
          actual_reps?: number | null
          actual_weight?: number | null
          completed?: boolean | null
          created_at?: string | null
          exercise_category: string
          exercise_name: string
          id?: string
          movement_pattern?: string | null
          primary_muscles?: string[] | null
          set_number: number
          target_reps?: number | null
          target_weight?: number | null
          template_id?: string | null
          template_snapshot?: Json | null
          workout_id: string
        }
        Update: {
          actual_reps?: number | null
          actual_weight?: number | null
          completed?: boolean | null
          created_at?: string | null
          exercise_category?: string
          exercise_name?: string
          id?: string
          movement_pattern?: string | null
          primary_muscles?: string[] | null
          set_number?: number
          target_reps?: number | null
          target_weight?: number | null
          template_id?: string | null
          template_snapshot?: Json | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "exercise_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_templates: {
        Row: {
          canonical_name: string
          category: string
          created_at: string | null
          default_reps: string | null
          default_weight: string | null
          deprecated_at: string | null
          equipment: string
          id: string
          movement_pattern: string
          name: string
          primary_muscles: string[]
          secondary_muscles: string[] | null
          updated_at: string | null
          user_id: string
          version: number
        }
        Insert: {
          canonical_name: string
          category: string
          created_at?: string | null
          default_reps?: string | null
          default_weight?: string | null
          deprecated_at?: string | null
          equipment?: string
          id?: string
          movement_pattern?: string
          name: string
          primary_muscles?: string[]
          secondary_muscles?: string[] | null
          updated_at?: string | null
          user_id: string
          version?: number
        }
        Update: {
          canonical_name?: string
          category?: string
          created_at?: string | null
          default_reps?: string | null
          default_weight?: string | null
          deprecated_at?: string | null
          equipment?: string
          id?: string
          movement_pattern?: string
          name?: string
          primary_muscles?: string[]
          secondary_muscles?: string[] | null
          updated_at?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      exercises: {
        Row: {
          actual_reps: string | null
          actual_weight: string | null
          category: string
          completed: boolean | null
          id: string
          name: string
          sort_order: number | null
          target_reps: string | null
          target_weight: string | null
          workout_id: string
        }
        Insert: {
          actual_reps?: string | null
          actual_weight?: string | null
          category: string
          completed?: boolean | null
          id?: string
          name: string
          sort_order?: number | null
          target_reps?: string | null
          target_weight?: string | null
          workout_id: string
        }
        Update: {
          actual_reps?: string | null
          actual_weight?: string | null
          category?: string
          completed?: boolean | null
          id?: string
          name?: string
          sort_order?: number | null
          target_reps?: string | null
          target_weight?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_history: {
        Row: {
          created_at: string
          effective_from: string
          goal_key: string
          id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          effective_from: string
          goal_key: string
          id?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          effective_from?: string
          goal_key?: string
          id?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      habits: {
        Row: {
          bodyweight: number | null
          energy_level: number | null
          id: string
          notes: string | null
          pullups: number | null
          sleep_hours: number | null
          supplements: Json | null
          water_intake: number | null
          workout_id: string
        }
        Insert: {
          bodyweight?: number | null
          energy_level?: number | null
          id?: string
          notes?: string | null
          pullups?: number | null
          sleep_hours?: number | null
          supplements?: Json | null
          water_intake?: number | null
          workout_id: string
        }
        Update: {
          bodyweight?: number | null
          energy_level?: number | null
          id?: string
          notes?: string | null
          pullups?: number | null
          sleep_hours?: number | null
          supplements?: Json | null
          water_intake?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: true
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          ai_confidence: number | null
          ai_detected_food: string | null
          calories: number | null
          carbs: number | null
          created_at: string | null
          date: string
          fat: number | null
          fiber: number | null
          food_name: string | null
          food_quality: string | null
          id: string
          is_confirmed: boolean | null
          meal_type: string
          notes: string | null
          photo_url: string | null
          protein: number | null
          sodium: number | null
          sugar: number | null
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_detected_food?: string | null
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          date?: string
          fat?: number | null
          fiber?: number | null
          food_name?: string | null
          food_quality?: string | null
          id?: string
          is_confirmed?: boolean | null
          meal_type: string
          notes?: string | null
          photo_url?: string | null
          protein?: number | null
          sodium?: number | null
          sugar?: number | null
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_detected_food?: string | null
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          date?: string
          fat?: number | null
          fiber?: number | null
          food_name?: string | null
          food_quality?: string | null
          id?: string
          is_confirmed?: boolean | null
          meal_type?: string
          notes?: string | null
          photo_url?: string | null
          protein?: number | null
          sodium?: number | null
          sugar?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recovery_metrics: {
        Row: {
          created_at: string | null
          date: string
          deload_recommended: boolean | null
          fatigue_level: number | null
          hrv_ms: number | null
          id: string
          muscle_soreness: number | null
          notes: string | null
          recovery_score: number | null
          resting_hr: number | null
          sleep_quality: number | null
          stress_level: number | null
          updated_at: string | null
          user_id: string
          workout_readiness: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          deload_recommended?: boolean | null
          fatigue_level?: number | null
          hrv_ms?: number | null
          id?: string
          muscle_soreness?: number | null
          notes?: string | null
          recovery_score?: number | null
          resting_hr?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          updated_at?: string | null
          user_id: string
          workout_readiness?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          deload_recommended?: boolean | null
          fatigue_level?: number | null
          hrv_ms?: number | null
          id?: string
          muscle_soreness?: number | null
          notes?: string | null
          recovery_score?: number | null
          resting_hr?: number | null
          sleep_quality?: number | null
          stress_level?: number | null
          updated_at?: string | null
          user_id?: string
          workout_readiness?: number | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          activity_level: string | null
          adaptive_mode_enabled: boolean | null
          age: number | null
          created_at: string | null
          daily_calorie_goal: number | null
          daily_carbs_goal: number | null
          daily_deficit_target: number
          daily_fat_goal: number | null
          daily_fiber_goal: number | null
          daily_protein_goal: number
          daily_sodium_goal: number | null
          daily_sugar_goal: number | null
          daily_water_goal: number | null
          deficit_mode_enabled: boolean
          dietary_preferences: string[] | null
          fitness_goal: string | null
          gender: string | null
          height_cm: number | null
          id: string
          maintenance_calories: number | null
          onboarding_completed: boolean | null
          rest_days: Json | null
          routine_setup_completed: boolean | null
          sleep_goal: number | null
          training_focus: string | null
          training_split: string | null
          units_system: string | null
          updated_at: string | null
          user_id: string
          weekly_workout_goal: number | null
          weight_goal: number | null
          weight_goal_type: string | null
        }
        Insert: {
          activity_level?: string | null
          adaptive_mode_enabled?: boolean | null
          age?: number | null
          created_at?: string | null
          daily_calorie_goal?: number | null
          daily_carbs_goal?: number | null
          daily_deficit_target?: number
          daily_fat_goal?: number | null
          daily_fiber_goal?: number | null
          daily_protein_goal?: number
          daily_sodium_goal?: number | null
          daily_sugar_goal?: number | null
          daily_water_goal?: number | null
          deficit_mode_enabled?: boolean
          dietary_preferences?: string[] | null
          fitness_goal?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          maintenance_calories?: number | null
          onboarding_completed?: boolean | null
          rest_days?: Json | null
          routine_setup_completed?: boolean | null
          sleep_goal?: number | null
          training_focus?: string | null
          training_split?: string | null
          units_system?: string | null
          updated_at?: string | null
          user_id: string
          weekly_workout_goal?: number | null
          weight_goal?: number | null
          weight_goal_type?: string | null
        }
        Update: {
          activity_level?: string | null
          adaptive_mode_enabled?: boolean | null
          age?: number | null
          created_at?: string | null
          daily_calorie_goal?: number | null
          daily_carbs_goal?: number | null
          daily_deficit_target?: number
          daily_fat_goal?: number | null
          daily_fiber_goal?: number | null
          daily_protein_goal?: number
          daily_sodium_goal?: number | null
          daily_sugar_goal?: number | null
          daily_water_goal?: number | null
          deficit_mode_enabled?: boolean
          dietary_preferences?: string[] | null
          fitness_goal?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          maintenance_calories?: number | null
          onboarding_completed?: boolean | null
          rest_days?: Json | null
          routine_setup_completed?: boolean | null
          sleep_goal?: number | null
          training_focus?: string | null
          training_split?: string | null
          units_system?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_workout_goal?: number | null
          weight_goal?: number | null
          weight_goal_type?: string | null
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount: number | null
          id: string
          method: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          id?: string
          method?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          id?: string
          method?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          completed_at: string | null
          created_at: string | null
          date: string
          day: string
          day_name: string
          id: string
          is_skipped: boolean | null
          post_difficulty: number | null
          post_satisfaction: number | null
          pre_energy: number | null
          pre_motivation: number | null
          pre_soreness: number | null
          started_at: string | null
          user_id: string
          week_number: number
          workout_duration_minutes: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          date?: string
          day: string
          day_name: string
          id?: string
          is_skipped?: boolean | null
          post_difficulty?: number | null
          post_satisfaction?: number | null
          pre_energy?: number | null
          pre_motivation?: number | null
          pre_soreness?: number | null
          started_at?: string | null
          user_id: string
          week_number?: number
          workout_duration_minutes?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          date?: string
          day?: string
          day_name?: string
          id?: string
          is_skipped?: boolean | null
          post_difficulty?: number | null
          post_satisfaction?: number | null
          pre_energy?: number | null
          pre_motivation?: number | null
          pre_soreness?: number | null
          started_at?: string | null
          user_id?: string
          week_number?: number
          workout_duration_minutes?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_exists: { Args: { email_input: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
