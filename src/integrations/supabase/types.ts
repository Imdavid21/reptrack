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
      calorie_burns: {
        Row: {
          activity_type: string | null
          calories: number
          created_at: string | null
          date: string
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
          id: string
          notes: string | null
          pullups: number | null
          sleep_hours: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bodyweight?: number | null
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          pullups?: number | null
          sleep_hours?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bodyweight?: number | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          pullups?: number | null
          sleep_hours?: number | null
          updated_at?: string | null
          user_id?: string
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
          id: string
          notes: string | null
          pullups: number | null
          sleep_hours: number | null
          water_intake: number | null
          workout_id: string
        }
        Insert: {
          bodyweight?: number | null
          id?: string
          notes?: string | null
          pullups?: number | null
          sleep_hours?: number | null
          water_intake?: number | null
          workout_id: string
        }
        Update: {
          bodyweight?: number | null
          id?: string
          notes?: string | null
          pullups?: number | null
          sleep_hours?: number | null
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
      user_preferences: {
        Row: {
          age: number | null
          auto_rest_timer: boolean | null
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
          default_rest_seconds: number | null
          deficit_mode_enabled: boolean
          fitness_goal: string | null
          gender: string | null
          height_cm: number | null
          id: string
          maintenance_calories: number | null
          name: string | null
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
          age?: number | null
          auto_rest_timer?: boolean | null
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
          default_rest_seconds?: number | null
          deficit_mode_enabled?: boolean
          fitness_goal?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          maintenance_calories?: number | null
          name?: string | null
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
          age?: number | null
          auto_rest_timer?: boolean | null
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
          default_rest_seconds?: number | null
          deficit_mode_enabled?: boolean
          fitness_goal?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          maintenance_calories?: number | null
          name?: string | null
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
