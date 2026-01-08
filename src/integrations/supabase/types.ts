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
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
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
      water_reminder_configs: {
        Row: {
          created_at: string | null
          end_time: string
          frequency_minutes: number
          id: string
          is_active: boolean | null
          start_time: string
          telegram_chat_id: string | null
          telegram_username: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_time?: string
          frequency_minutes?: number
          id?: string
          is_active?: boolean | null
          start_time?: string
          telegram_chat_id?: string | null
          telegram_username: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          frequency_minutes?: number
          id?: string
          is_active?: boolean | null
          start_time?: string
          telegram_chat_id?: string | null
          telegram_username?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      water_reminder_logs: {
        Row: {
          attempt_number: number
          confirmed_at: string | null
          created_at: string | null
          id: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          attempt_number?: number
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          attempt_number?: number
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string | null
          date: string
          day: string
          day_name: string
          id: string
          user_id: string
          week_number: number
        }
        Insert: {
          created_at?: string | null
          date?: string
          day: string
          day_name: string
          id?: string
          user_id: string
          week_number?: number
        }
        Update: {
          created_at?: string | null
          date?: string
          day?: string
          day_name?: string
          id?: string
          user_id?: string
          week_number?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
