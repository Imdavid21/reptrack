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
      api_rate_limits: {
        Row: {
          bucket: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          bucket: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          bucket?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      calorie_burns: {
        Row: {
          activity_type: string | null
          calculation_inputs: Json
          calories: number
          confidence: string | null
          created_at: string | null
          date: string
          distance_km: number | null
          duration_minutes: number | null
          effective_weight_kg: number | null
          ended_at: string | null
          energy_model_version: number
          id: string
          intensity_band: string | null
          intensity_source: string | null
          met_estimate: number | null
          source: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          calculation_inputs?: Json
          calories: number
          confidence?: string | null
          created_at?: string | null
          date?: string
          distance_km?: number | null
          duration_minutes?: number | null
          effective_weight_kg?: number | null
          ended_at?: string | null
          energy_model_version?: number
          id?: string
          intensity_band?: string | null
          intensity_source?: string | null
          met_estimate?: number | null
          source: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string | null
          calculation_inputs?: Json
          calories?: number
          confidence?: string | null
          created_at?: string | null
          date?: string
          distance_km?: number | null
          duration_minutes?: number | null
          effective_weight_kg?: number | null
          ended_at?: string | null
          energy_model_version?: number
          id?: string
          intensity_band?: string | null
          intensity_source?: string | null
          met_estimate?: number | null
          source?: string
          started_at?: string | null
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
      energy_model_states: {
        Row: {
          calculated_at: string
          calibrated_tdee: number | null
          calibration_adjustment: number
          calibration_confidence: string | null
          calibration_eligible: boolean
          data_quality: string | null
          effective_date: string
          effective_weight_kg: number | null
          energy_model_version: number
          formula_baseline: number | null
          formula_ree: number | null
          id: string
          inputs: Json
          likely_high: number | null
          likely_low: number | null
          nonexercise_factor: number | null
          personal_baseline: number | null
          predicted_tdee: number | null
          user_id: string
          weight_source: string | null
        }
        Insert: {
          calculated_at?: string
          calibrated_tdee?: number | null
          calibration_adjustment?: number
          calibration_confidence?: string | null
          calibration_eligible?: boolean
          data_quality?: string | null
          effective_date: string
          effective_weight_kg?: number | null
          energy_model_version?: number
          formula_baseline?: number | null
          formula_ree?: number | null
          id?: string
          inputs?: Json
          likely_high?: number | null
          likely_low?: number | null
          nonexercise_factor?: number | null
          personal_baseline?: number | null
          predicted_tdee?: number | null
          user_id: string
          weight_source?: string | null
        }
        Update: {
          calculated_at?: string
          calibrated_tdee?: number | null
          calibration_adjustment?: number
          calibration_confidence?: string | null
          calibration_eligible?: boolean
          data_quality?: string | null
          effective_date?: string
          effective_weight_kg?: number | null
          energy_model_version?: number
          formula_baseline?: number | null
          formula_ree?: number | null
          id?: string
          inputs?: Json
          likely_high?: number | null
          likely_low?: number | null
          nonexercise_factor?: number | null
          personal_baseline?: number | null
          predicted_tdee?: number | null
          user_id?: string
          weight_source?: string | null
        }
        Relationships: []
      }
      energy_targets: {
        Row: {
          basis: string
          calorie_target: number
          effective_from: string
          energy_model_version: number
          estimated_maintenance: number
          generated_at: string
          id: string
          protein_target: number
          reason: string
          target_adjustment: number
          user_id: string
        }
        Insert: {
          basis: string
          calorie_target: number
          effective_from: string
          energy_model_version?: number
          estimated_maintenance: number
          generated_at?: string
          id?: string
          protein_target: number
          reason: string
          target_adjustment?: number
          user_id: string
        }
        Update: {
          basis?: string
          calorie_target?: number
          effective_from?: string
          energy_model_version?: number
          estimated_maintenance?: number
          generated_at?: string
          id?: string
          protein_target?: number
          reason?: string
          target_adjustment?: number
          user_id?: string
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
          actual_rir: number | null
          actual_weight: string | null
          category: string
          completed: boolean | null
          id: string
          name: string
          pain_score: number | null
          prescription: Json | null
          rom_quality: number | null
          set_kind: string
          sort_order: number | null
          target_reps: string | null
          target_weight: string | null
          workout_id: string
        }
        Insert: {
          actual_reps?: string | null
          actual_rir?: number | null
          actual_weight?: string | null
          category: string
          completed?: boolean | null
          id?: string
          name: string
          pain_score?: number | null
          prescription?: Json | null
          rom_quality?: number | null
          set_kind?: string
          sort_order?: number | null
          target_reps?: string | null
          target_weight?: string | null
          workout_id: string
        }
        Update: {
          actual_reps?: string | null
          actual_rir?: number | null
          actual_weight?: string | null
          category?: string
          completed?: boolean | null
          id?: string
          name?: string
          pain_score?: number | null
          prescription?: Json | null
          rom_quality?: number | null
          set_kind?: string
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
      mcp_audit_logs: {
        Row: {
          created_at: string
          duration_ms: number
          error_category: string | null
          id: string
          success: boolean
          tool_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          error_category?: string | null
          id?: string
          success?: boolean
          tool_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error_category?: string | null
          id?: string
          success?: boolean
          tool_name?: string
          user_id?: string
        }
        Relationships: []
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
          nutrition_source: string
          photo_url: string | null
          potassium: number | null
          protein: number | null
          sodium: number | null
          source_metadata: Json
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
          nutrition_source?: string
          photo_url?: string | null
          potassium?: number | null
          protein?: number | null
          sodium?: number | null
          source_metadata?: Json
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
          nutrition_source?: string
          photo_url?: string | null
          potassium?: number | null
          protein?: number | null
          sodium?: number | null
          source_metadata?: Json
          sugar?: number | null
          user_id?: string
        }
        Relationships: []
      }
      mobility_assessments: {
        Row: {
          assessment_date: string
          created_at: string
          deep_squat_depth: string | null
          discomfort: string | null
          heels_down: boolean | null
          hip_90_90_left: number | null
          hip_90_90_right: number | null
          hip_flexion_restriction: number | null
          id: string
          knee_to_wall_left_cm: number | null
          knee_to_wall_right_cm: number | null
          user_id: string
        }
        Insert: {
          assessment_date?: string
          created_at?: string
          deep_squat_depth?: string | null
          discomfort?: string | null
          heels_down?: boolean | null
          hip_90_90_left?: number | null
          hip_90_90_right?: number | null
          hip_flexion_restriction?: number | null
          id?: string
          knee_to_wall_left_cm?: number | null
          knee_to_wall_right_cm?: number | null
          user_id: string
        }
        Update: {
          assessment_date?: string
          created_at?: string
          deep_squat_depth?: string | null
          discomfort?: string | null
          heels_down?: boolean | null
          hip_90_90_left?: number | null
          hip_90_90_right?: number | null
          hip_flexion_restriction?: number | null
          id?: string
          knee_to_wall_left_cm?: number | null
          knee_to_wall_right_cm?: number | null
          user_id?: string
        }
        Relationships: []
      }
      physique_checkins: {
        Row: {
          bodyweight: number | null
          calf_left_cm: number | null
          calf_right_cm: number | null
          checkin_date: string
          chest_cm: number | null
          created_at: string
          id: string
          photo_paths: Json
          upper_arm_left_cm: number | null
          upper_arm_right_cm: number | null
          user_id: string
          waist_cm: number | null
        }
        Insert: {
          bodyweight?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          checkin_date?: string
          chest_cm?: number | null
          created_at?: string
          id?: string
          photo_paths?: Json
          upper_arm_left_cm?: number | null
          upper_arm_right_cm?: number | null
          user_id: string
          waist_cm?: number | null
        }
        Update: {
          bodyweight?: number | null
          calf_left_cm?: number | null
          calf_right_cm?: number | null
          checkin_date?: string
          chest_cm?: number | null
          created_at?: string
          id?: string
          photo_paths?: Json
          upper_arm_left_cm?: number | null
          upper_arm_right_cm?: number | null
          user_id?: string
          waist_cm?: number | null
        }
        Relationships: []
      }
      post_workout_checkins: {
        Row: {
          completion_percent: number | null
          created_at: string
          energy: number | null
          exercise_felt_wrong: string | null
          id: string
          joint_discomfort: number | null
          notes: string | null
          pump: number | null
          target_stimulus: number | null
          user_id: string
          workout_difficulty: number | null
          workout_id: string | null
        }
        Insert: {
          completion_percent?: number | null
          created_at?: string
          energy?: number | null
          exercise_felt_wrong?: string | null
          id?: string
          joint_discomfort?: number | null
          notes?: string | null
          pump?: number | null
          target_stimulus?: number | null
          user_id: string
          workout_difficulty?: number | null
          workout_id?: string | null
        }
        Update: {
          completion_percent?: number | null
          created_at?: string
          energy?: number | null
          exercise_felt_wrong?: string | null
          id?: string
          joint_discomfort?: number | null
          notes?: string | null
          pump?: number | null
          target_stimulus?: number | null
          user_id?: string
          workout_difficulty?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_workout_checkins_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
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
      readiness_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          fatigue: number | null
          id: string
          illness: boolean | null
          joint_discomfort: number | null
          motivation: number | null
          readiness: number | null
          recommendation: string | null
          resting_hr: number | null
          session_key: string | null
          sharp_pain: boolean | null
          sleep_hours: number | null
          soreness: number | null
          user_id: string
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          fatigue?: number | null
          id?: string
          illness?: boolean | null
          joint_discomfort?: number | null
          motivation?: number | null
          readiness?: number | null
          recommendation?: string | null
          resting_hr?: number | null
          session_key?: string | null
          sharp_pain?: boolean | null
          sleep_hours?: number | null
          soreness?: number | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          fatigue?: number | null
          id?: string
          illness?: boolean | null
          joint_discomfort?: number | null
          motivation?: number | null
          readiness?: number | null
          recommendation?: string | null
          resting_hr?: number | null
          session_key?: string | null
          sharp_pain?: boolean | null
          sleep_hours?: number | null
          soreness?: number | null
          user_id?: string
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
      training_state: {
        Row: {
          block_name: string | null
          deload_active: boolean
          deload_started_on: string | null
          next_session: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          block_name?: string | null
          deload_active?: boolean
          deload_started_on?: string | null
          next_session?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          block_name?: string | null
          deload_active?: boolean
          deload_started_on?: string | null
          next_session?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          activity_level: string | null
          adaptive_mode_enabled: boolean | null
          age: number | null
          calorie_target_locked: boolean
          created_at: string | null
          daily_calorie_goal: number | null
          daily_carbs_goal: number | null
          daily_deficit_target: number
          daily_fat_goal: number | null
          daily_fiber_goal: number | null
          daily_potassium_goal: number | null
          daily_protein_goal: number
          daily_sodium_goal: number | null
          daily_sugar_goal: number | null
          daily_water_goal: number | null
          date_of_birth: string | null
          deficit_mode_enabled: boolean
          dietary_preferences: string[] | null
          fitness_goal: string | null
          gender: string | null
          height_cm: number | null
          id: string
          initial_weight_kg: number | null
          maintenance_calories: number | null
          nonexercise_lifestyle: string
          onboarding_completed: boolean | null
          protein_target_locked: boolean
          rest_days: Json | null
          routine_setup_completed: boolean | null
          show_bmr_on_dashboard: boolean | null
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
          calorie_target_locked?: boolean
          created_at?: string | null
          daily_calorie_goal?: number | null
          daily_carbs_goal?: number | null
          daily_deficit_target?: number
          daily_fat_goal?: number | null
          daily_fiber_goal?: number | null
          daily_potassium_goal?: number | null
          daily_protein_goal?: number
          daily_sodium_goal?: number | null
          daily_sugar_goal?: number | null
          daily_water_goal?: number | null
          date_of_birth?: string | null
          deficit_mode_enabled?: boolean
          dietary_preferences?: string[] | null
          fitness_goal?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          initial_weight_kg?: number | null
          maintenance_calories?: number | null
          nonexercise_lifestyle?: string
          onboarding_completed?: boolean | null
          protein_target_locked?: boolean
          rest_days?: Json | null
          routine_setup_completed?: boolean | null
          show_bmr_on_dashboard?: boolean | null
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
          calorie_target_locked?: boolean
          created_at?: string | null
          daily_calorie_goal?: number | null
          daily_carbs_goal?: number | null
          daily_deficit_target?: number
          daily_fat_goal?: number | null
          daily_fiber_goal?: number | null
          daily_potassium_goal?: number | null
          daily_protein_goal?: number
          daily_sodium_goal?: number | null
          daily_sugar_goal?: number | null
          daily_water_goal?: number | null
          date_of_birth?: string | null
          deficit_mode_enabled?: boolean
          dietary_preferences?: string[] | null
          fitness_goal?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          initial_weight_kg?: number | null
          maintenance_calories?: number | null
          nonexercise_lifestyle?: string
          onboarding_completed?: boolean | null
          protein_target_locked?: boolean
          rest_days?: Json | null
          routine_setup_completed?: boolean | null
          show_bmr_on_dashboard?: boolean | null
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
      workout_pauses: {
        Row: {
          created_at: string
          draft_id: string | null
          id: string
          paused_at: string
          resumed_at: string | null
          user_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          draft_id?: string | null
          id?: string
          paused_at: string
          resumed_at?: string | null
          user_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          draft_id?: string | null
          id?: string
          paused_at?: string
          resumed_at?: string | null
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_pauses_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          completed_at: string | null
          completion_percent: number | null
          created_at: string | null
          date: string
          day: string
          day_name: string
          energy_confidence: string | null
          energy_inputs: Json
          energy_model_version: number | null
          estimated_net_kcal: number | null
          explicit_pause_seconds: number
          id: string
          is_skipped: boolean | null
          post_difficulty: number | null
          post_satisfaction: number | null
          pre_energy: number | null
          pre_motivation: number | null
          pre_soreness: number | null
          readiness_band: string | null
          readiness_id: string | null
          session_key: string | null
          started_at: string | null
          user_id: string
          week_number: number
          workout_duration_minutes: number | null
        }
        Insert: {
          completed_at?: string | null
          completion_percent?: number | null
          created_at?: string | null
          date?: string
          day: string
          day_name: string
          energy_confidence?: string | null
          energy_inputs?: Json
          energy_model_version?: number | null
          estimated_net_kcal?: number | null
          explicit_pause_seconds?: number
          id?: string
          is_skipped?: boolean | null
          post_difficulty?: number | null
          post_satisfaction?: number | null
          pre_energy?: number | null
          pre_motivation?: number | null
          pre_soreness?: number | null
          readiness_band?: string | null
          readiness_id?: string | null
          session_key?: string | null
          started_at?: string | null
          user_id: string
          week_number?: number
          workout_duration_minutes?: number | null
        }
        Update: {
          completed_at?: string | null
          completion_percent?: number | null
          created_at?: string | null
          date?: string
          day?: string
          day_name?: string
          energy_confidence?: string | null
          energy_inputs?: Json
          energy_model_version?: number | null
          estimated_net_kcal?: number | null
          explicit_pause_seconds?: number
          id?: string
          is_skipped?: boolean | null
          post_difficulty?: number | null
          post_satisfaction?: number | null
          pre_energy?: number | null
          pre_motivation?: number | null
          pre_soreness?: number | null
          readiness_band?: string | null
          readiness_id?: string | null
          session_key?: string | null
          started_at?: string | null
          user_id?: string
          week_number?: number
          workout_duration_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_readiness_id_fkey"
            columns: ["readiness_id"]
            isOneToOne: false
            referencedRelation: "readiness_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_exists: { Args: { email_input: string }; Returns: boolean }
      check_rate_limit: {
        Args: { p_bucket: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      delete_my_account: { Args: never; Returns: undefined }
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
