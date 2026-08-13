import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export type DataTable =
  | 'workouts'
  | 'exercises'
  | 'daily_metrics'
  | 'water_logs'
  | 'meals'
  | 'calorie_burns'
  | 'habits'
  | 'custom_routines'
  | 'user_preferences'
  | 'goal_history'
  | 'adaptive_lifecycles'
  | 'adaptive_session_logs'
  | 'training_state'
  | 'readiness_checkins'
  | 'post_workout_checkins'
  | 'mobility_assessments'
  | 'physique_checkins';

interface ExportOptions {
  tables: DataTable[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface LastExportFile {
  filename: string;
  url: string;
  mimeType: string;
  createdAt: Date;
}

// Column mappings for each table. Kept in sync with the actual schema
// (src/integrations/supabase/types.ts) by hand — this list previously drifted
// badly behind real columns (e.g. every Deficit Mode and Adaptive Mode field
// on user_preferences, workout check-in fields, calorie_burns.distance_km),
// so "export all my data" silently left most of a user's settings and several
// whole feature areas out of the file.
export const TABLE_COLUMNS: Record<DataTable, string[]> = {
  workouts: [
    'id', 'user_id', 'date', 'day', 'day_name', 'week_number',
    'started_at', 'completed_at', 'workout_duration_minutes', 'is_skipped',
    'pre_energy', 'pre_motivation', 'pre_soreness', 'post_difficulty', 'post_satisfaction',
    'session_key', 'readiness_band', 'completion_percent',
    'created_at'
  ],
  exercises: [
    'id', 'workout_id', 'name', 'category', 'sort_order',
    'target_weight', 'target_reps', 'actual_weight', 'actual_reps',
    'completed', 'actual_rir', 'rom_quality', 'pain_score', 'set_kind', 'prescription'
  ],
  daily_metrics: [
    'id', 'user_id', 'date', 'sleep_hours', 'bodyweight', 'pullups',
    'energy_level', 'is_rest_day', 'supplements', 'notes', 'created_at', 'updated_at'
  ],
  water_logs: [
    'id', 'user_id', 'timestamp', 'amount', 'method'
  ],
  meals: [
    'id', 'user_id', 'date', 'meal_type', 'food_name', 'calories',
    'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'food_quality',
    'photo_url', 'ai_detected_food', 'ai_confidence', 'is_confirmed', 'notes', 'created_at'
  ],
  calorie_burns: [
    'id', 'user_id', 'date', 'calories', 'source', 'activity_type',
    'duration_minutes', 'distance_km', 'created_at'
  ],
  habits: [
    'id', 'workout_id', 'pullups', 'water_intake', 'sleep_hours',
    'bodyweight', 'energy_level', 'supplements', 'notes'
  ],
  custom_routines: [
    'id', 'user_id', 'routine_name', 'routine_data', 'is_active', 'created_at'
  ],
  user_preferences: [
    'id', 'user_id', 'name', 'age', 'gender', 'height_cm', 'activity_level',
    'units_system', 'weight_goal_type', 'weight_goal', 'sleep_goal',
    'weekly_workout_goal', 'daily_calorie_goal', 'daily_protein_goal',
    'daily_carbs_goal', 'daily_fat_goal', 'daily_fiber_goal', 'daily_sugar_goal',
    'daily_sodium_goal', 'daily_water_goal', 'dietary_preferences',
    'deficit_mode_enabled', 'daily_deficit_target', 'maintenance_calories',
    'adaptive_mode_enabled', 'onboarding_completed', 'routine_setup_completed',
    'rest_days', 'training_split', 'training_focus', 'default_rest_seconds',
    'auto_rest_timer', 'show_bmr_on_dashboard', 'fitness_goal', 'created_at', 'updated_at'
  ],
  goal_history: [
    'id', 'user_id', 'goal_key', 'value', 'effective_from', 'created_at'
  ],
  adaptive_lifecycles: [
    'id', 'user_id', 'movement_pattern', 'variation_name', 'phase_modifier',
    'rep_range_low', 'rep_range_high', 'start_date', 'end_date',
    'starting_load', 'ending_load', 'carryover_in', 'carryover_out',
    'end_trigger', 'weak_points_targeted', 'status', 'created_at', 'updated_at'
  ],
  adaptive_session_logs: [
    'id', 'user_id', 'lifecycle_id', 'session_date', 'leading_load', 'leading_reps',
    'backoff_load', 'backoff_reps', 'weak_point_zone', 'form_note', 'created_at'
  ],
  training_state: ['user_id', 'next_session', 'block_name', 'deload_active', 'deload_started_on', 'updated_at'],
  readiness_checkins: ['id', 'user_id', 'session_key', 'checkin_date', 'sleep_hours', 'soreness', 'joint_discomfort', 'fatigue', 'motivation', 'resting_hr', 'illness', 'sharp_pain', 'readiness', 'recommendation', 'created_at'],
  post_workout_checkins: ['id', 'user_id', 'workout_id', 'workout_difficulty', 'pump', 'target_stimulus', 'joint_discomfort', 'energy', 'exercise_felt_wrong', 'completion_percent', 'notes', 'created_at'],
  mobility_assessments: ['id', 'user_id', 'assessment_date', 'deep_squat_depth', 'heels_down', 'discomfort', 'knee_to_wall_left_cm', 'knee_to_wall_right_cm', 'hip_90_90_left', 'hip_90_90_right', 'hip_flexion_restriction', 'created_at'],
  physique_checkins: ['id', 'user_id', 'checkin_date', 'bodyweight', 'waist_cm', 'upper_arm_left_cm', 'upper_arm_right_cm', 'chest_cm', 'calf_left_cm', 'calf_right_cm', 'photo_paths', 'created_at'],
};

// Tables that link via a foreign key to another exported table's row,
// instead of (or in addition to) a direct user_id. On import, that FK has to
// be remapped from the old CSV id to the newly-inserted row's real id — the
// DB assigns fresh ids on insert, so the old ids from the export are
// meaningless afterward. Getting this wrong (dropping the FK column instead
// of remapping it) silently orphans every imported row: exercises/habits
// with no workout to attach to, adaptive session logs with no lifecycle.
export const LINKED_TABLES: Partial<Record<DataTable, { parentTable: DataTable; fkColumn: string }>> = {
  exercises: { parentTable: 'workouts', fkColumn: 'workout_id' },
  habits: { parentTable: 'workouts', fkColumn: 'workout_id' },
  adaptive_session_logs: { parentTable: 'adaptive_lifecycles', fkColumn: 'lifecycle_id' },
  post_workout_checkins: { parentTable: 'workouts', fkColumn: 'workout_id' },
};

const TABLE_ORDER_BY: Record<DataTable, { column: string; ascending: boolean } | null> = {
  workouts: { column: 'date', ascending: true },
  exercises: { column: 'sort_order', ascending: true },
  daily_metrics: { column: 'date', ascending: true },
  water_logs: { column: 'timestamp', ascending: true },
  meals: { column: 'date', ascending: true },
  calorie_burns: { column: 'date', ascending: true },
  habits: null,
  custom_routines: { column: 'created_at', ascending: true },
  user_preferences: { column: 'created_at', ascending: true },
  goal_history: { column: 'effective_from', ascending: true },
  adaptive_lifecycles: { column: 'start_date', ascending: true },
  adaptive_session_logs: { column: 'session_date', ascending: true },
  training_state: null,
  readiness_checkins: { column: 'checkin_date', ascending: true },
  post_workout_checkins: { column: 'created_at', ascending: true },
  mobility_assessments: { column: 'assessment_date', ascending: true },
  physique_checkins: { column: 'checkin_date', ascending: true },
};

/** Every column that's a genuine number in the DB, across all tables — used to parse CSV strings back to numbers on import. */
export const NUMERIC_FIELDS = new Set([
  // exercises
  'actual_weight', 'actual_reps', 'target_weight', 'target_reps', 'sort_order',
  // daily_metrics / habits
  'sleep_hours', 'bodyweight', 'pullups', 'energy_level',
  // water_logs
  'amount',
  // meals
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'ai_confidence',
  // calorie_burns
  'duration_minutes', 'distance_km',
  // habits
  'water_intake',
  // workouts
  'workout_duration_minutes', 'week_number', 'pre_energy', 'pre_motivation',
  'pre_soreness', 'post_difficulty', 'post_satisfaction',
  // user_preferences
  'age', 'height_cm', 'weight_goal', 'sleep_goal', 'weekly_workout_goal',
  'daily_calorie_goal', 'daily_protein_goal', 'daily_carbs_goal', 'daily_fat_goal',
  'daily_fiber_goal', 'daily_sugar_goal', 'daily_sodium_goal', 'daily_water_goal',
  'daily_deficit_target', 'maintenance_calories', 'default_rest_seconds',
  'completion_percent', 'actual_rir', 'rom_quality', 'pain_score', 'fatigue', 'motivation', 'resting_hr',
  'workout_difficulty', 'pump', 'target_stimulus', 'joint_discomfort', 'energy', 'discomfort',
  'knee_to_wall_left_cm', 'knee_to_wall_right_cm', 'hip_90_90_left', 'hip_90_90_right', 'hip_flexion_restriction', 'waist_cm',
  // goal_history
  'value',
  // adaptive_lifecycles
  'rep_range_low', 'rep_range_high', 'starting_load', 'ending_load',
  'carryover_in', 'carryover_out',
  // adaptive_session_logs
  'leading_load', 'leading_reps', 'backoff_load', 'backoff_reps',
]);

/** Every column that's a genuine boolean in the DB — parsed from the CSV's "true"/"1" text back to a real boolean on import. */
export const BOOLEAN_FIELDS = new Set([
  'completed', 'is_confirmed', 'is_skipped', 'auto_rest_timer', 'is_active',
  'onboarding_completed', 'routine_setup_completed', 'deficit_mode_enabled',
  'adaptive_mode_enabled', 'is_rest_day',
  'show_bmr_on_dashboard', 'deload_active', 'illness', 'sharp_pain', 'exercise_felt_wrong', 'heels_down',
]);

const JSON_FIELDS = new Set(['routine_data', 'dietary_preferences', 'rest_days', 'weak_points_targeted', 'prescription', 'soreness', 'recommendation', 'photo_paths']);

const PAGE_SIZE = 1000;

async function fetchAllPaged<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';

  const stringValue = typeof value === 'object'
    ? JSON.stringify(value)
    : String(value);

  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

/** Parse a full CSV document, retaining newlines that appear inside quoted cells. */
export function parseCSVRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < content.length; index++) {
    const char = content[index];
    if (char === '"') {
      if (inQuotes && content[index + 1] === '"') { current += '"'; index++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) { row.push(current.trim()); current = ''; }
    else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[index + 1] === '\n') index++;
      row.push(current.trim());
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = []; current = '';
    } else current += char;
  }
  row.push(current.trim());
  if (row.some(cell => cell.length > 0)) rows.push(row);
  return rows;
}

export function useDataExport() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, table: '' });
  const [lastExport, setLastExport] = useState<LastExportFile | null>(null);

  // Revoke object URLs on unmount (and when the URL changes).
  useEffect(() => {
    return () => {
      if (lastExport?.url) URL.revokeObjectURL(lastExport.url);
    };
  }, [lastExport?.url]);

  const setLastExportSafely = (next: LastExportFile | null) => {
    setLastExport(prev => {
      if (prev?.url && (!next || prev.url !== next.url)) {
        URL.revokeObjectURL(prev.url);
      }
      return next;
    });
  };

  const clearLastExport = () => setLastExportSafely(null);

  const downloadLastExport = () => {
    if (!lastExport) return;
    triggerBrowserDownload(lastExport.url, lastExport.filename);
  };

  const exportToCSV = async (options: ExportOptions): Promise<LastExportFile | null> => {
    if (!user) throw new Error('Not authenticated');

    setIsExporting(true);
    setProgress({ current: 0, total: options.tables.length, table: '' });
    setLastExportSafely(null);

    try {
      const csvFiles: { name: string; content: string }[] = [];

      for (let i = 0; i < options.tables.length; i++) {
        const table = options.tables[i];
        setProgress({ current: i + 1, total: options.tables.length, table });

        let data: Record<string, any>[] | null = null;
        const error: any = null;

        // Handle tables that don't have a direct user_id (they link via a parent row instead)
        const linked = LINKED_TABLES[table];
        if (linked) {
          // Get all parent-table IDs for this user first
          const parents = await fetchAllPaged<{ id: string }>(async (from, to) => {
            const result = await (supabase as any)
              .from(linked.parentTable)
              .select('id')
              .eq('user_id', user.id)
              .range(from, to);
            return { data: (result.data ?? null) as { id: string }[] | null, error: result.error };
          });

          if (parents.length > 0) {
            const parentIds = parents.map(w => w.id);
            const chunkSize = 100;
            const allRows: Record<string, any>[] = [];

            for (let c = 0; c < parentIds.length; c += chunkSize) {
              const chunk = parentIds.slice(c, c + chunkSize);
              const orderBy = TABLE_ORDER_BY[table];

              const rowsForChunk = await fetchAllPaged<Record<string, any>>(async (from, to) => {
                let q = (supabase.from(table) as any).select('*').in(linked.fkColumn, chunk);
                if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending });
                const result = await q.range(from, to);
                return { data: result.data ?? null, error: result.error };
              });

              allRows.push(...rowsForChunk);
            }

            data = allRows;
          }
        } else {
          // Standard query for tables with user_id
          const orderBy = TABLE_ORDER_BY[table];
          data = await fetchAllPaged<Record<string, any>>(async (from, to) => {
            let q = (supabase.from(table) as any).select('*').eq('user_id', user.id);
            if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending });
            const result = await q.range(from, to);
            return { data: result.data ?? null, error: result.error };
          });
        }

        if (error) throw error;

        if (data && data.length > 0) {
          const columns = TABLE_COLUMNS[table];

          // Create CSV content
          const headerRow = columns.join(',');
          const dataRows = data.map(row =>
            columns.map(col => escapeCSV(row[col as keyof typeof row])).join(',')
          );

          const csvContent = [headerRow, ...dataRows].join('\n');
          csvFiles.push({ name: `${table}.csv`, content: csvContent });
        }
      }

      // Prepare final export (single CSV or combined multi-table CSV)
      if (csvFiles.length === 0) return null;

      const exportContent =
        csvFiles.length === 1
          ? csvFiles[0].content
          : csvFiles
              .map(f => `### TABLE: ${f.name.replace('.csv', '')} ###\n${f.content}`)
              .join('\n\n');

      const exportFilename =
        csvFiles.length === 1
          ? csvFiles[0].name
          : `fitness_data_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;

      const mimeType = 'text/csv';
      const url = URL.createObjectURL(new Blob([exportContent], { type: mimeType }));
      const file: LastExportFile = {
        filename: exportFilename,
        url,
        mimeType,
        createdAt: new Date(),
      };

      // Attempt automatic download (may be blocked on some browsers after async work);
      // we also store the URL so the user can click a dedicated Download button.
      setLastExportSafely(file);
      triggerBrowserDownload(url, exportFilename);
      return file;
    } finally {
      setIsExporting(false);
      setProgress({ current: 0, total: 0, table: '' });
    }
  };

  const exportAllData = async (): Promise<LastExportFile | null> => {
    const allTables: DataTable[] = [
      'workouts',
      'exercises',
      'daily_metrics',
      'water_logs',
      'meals',
      'calorie_burns',
      'habits',
      'custom_routines',
      'user_preferences',
      'goal_history',
      'adaptive_lifecycles',
      'adaptive_session_logs',
      'training_state',
      'readiness_checkins',
      'post_workout_checkins',
      'mobility_assessments',
      'physique_checkins',
    ];

    return await exportToCSV({ tables: allTables });
  };

  const importFromCSV = async (file: File): Promise<{
    success: boolean;
    imported: Record<string, number>;
    errors: string[];
  }> => {
    if (!user) throw new Error('Not authenticated');

    setIsImporting(true);
    const imported: Record<string, number> = {};
    const errors: string[] = [];
    // Old CSV id -> newly-inserted DB id, per table. Populated as each
    // "parent" table (workouts, adaptive_lifecycles) is imported, so
    // dependent tables (exercises/habits, adaptive_session_logs) can
    // reattach to the right freshly-created row instead of a dangling old id.
    const idMaps: Partial<Record<DataTable, Record<string, string>>> = {};

    try {
      const text = await file.text();
      const sections = text.split(/### TABLE: (\w+) ###\n/).filter(Boolean);

      // Handle single table CSV or combined export
      const tablesToProcess: { table: DataTable; content: string }[] = [];

      if (sections.length >= 2) {
        // Combined export format
        for (let i = 0; i < sections.length; i += 2) {
          const tableName = sections[i].trim() as DataTable;
          const content = sections[i + 1]?.trim();
          if (tableName && content && TABLE_COLUMNS[tableName]) {
            tablesToProcess.push({ table: tableName, content });
          }
        }
      } else {
        // Try to detect table from filename or first column
        const filename = file.name.replace('.csv', '').toLowerCase();
        if (TABLE_COLUMNS[filename as DataTable]) {
          tablesToProcess.push({ table: filename as DataTable, content: text });
        } else {
          errors.push(`Could not determine table type from file "${file.name}". Use exported files or name file as table (e.g., workouts.csv)`);
          return { success: false, imported, errors };
        }
      }

      // Parent tables must be imported before whatever links to them, so the
      // id map exists by the time a dependent table needs it — regardless of
      // the order they happened to appear in the file.
      const parentTablesNeeded = new Set(
        tablesToProcess
          .map(t => LINKED_TABLES[t.table]?.parentTable)
          .filter((t): t is DataTable => !!t)
      );
      tablesToProcess.sort((a, b) => {
        const aIsParent = parentTablesNeeded.has(a.table) ? 0 : 1;
        const bIsParent = parentTablesNeeded.has(b.table) ? 0 : 1;
        return aIsParent - bIsParent;
      });

      setProgress({ current: 0, total: tablesToProcess.length, table: '' });

      for (let i = 0; i < tablesToProcess.length; i++) {
        const { table, content } = tablesToProcess[i];
        setProgress({ current: i + 1, total: tablesToProcess.length, table });
        const linked = LINKED_TABLES[table];

        try {
          const csvRows = parseCSVRows(content);
          if (csvRows.length < 2) continue;

          const headers = csvRows[0];
          const oldIds: (string | null)[] = [];
          let skippedForMissingParent = 0;

          const rows = csvRows.slice(1).map(values => {
            const row: Record<string, any> = {};
            let oldId: string | null = null;
            let oldFkValue: string | null = null;

            headers.forEach((header, idx) => {
              let value: any = values[idx];

              if (header === 'id') {
                // Captured for remapping if other tables link to this row;
                // the DB assigns a fresh id on insert either way.
                oldId = value || null;
                return;
              }
              if (linked && header === linked.fkColumn) {
                // Captured, not dropped — remapped below once we know the
                // new id it should point to. Dropping this outright (as a
                // previous version of this importer did) silently orphaned
                // every imported exercise/habit/session log with no parent
                // row to attach to.
                oldFkValue = value || null;
                return;
              }

              // Parse special types
              if (value === '') {
                value = null;
              } else if (BOOLEAN_FIELDS.has(header)) {
                value = value === 'true' || value === '1';
              } else if (NUMERIC_FIELDS.has(header)) {
                value = value ? parseFloat(value) : null;
              } else if (JSON_FIELDS.has(header) || (table === 'readiness_checkins' && header === 'joint_discomfort')) {
                try { value = JSON.parse(value); } catch { throw new Error(`Invalid JSON in ${table}.${header}`); }
              }

              row[header] = value;
            });

            if (linked) {
              const parentMap = idMaps[linked.parentTable];
              const newFk = oldFkValue ? parentMap?.[oldFkValue] : undefined;
              if (!newFk) {
                // No matching parent row was imported in this same run (e.g.
                // the export file didn't include it, or it failed above) —
                // inserting would either violate the FK constraint or leave
                // an orphaned row. Skip it and report instead of guessing.
                // Deliberately NOT pushed to oldIds — it must stay index-
                // aligned with `rows` after the filter() below drops this
                // row, or later batching pairs the wrong old id with the
                // wrong newly-inserted row.
                skippedForMissingParent++;
                return null;
              }
              row[linked.fkColumn] = newFk;
            }

            // Add user_id to all rows
            row.user_id = user.id;
            oldIds.push(oldId);

            return row;
          }).filter((r): r is Record<string, any> => r !== null);

          if (skippedForMissingParent > 0) {
            errors.push(`${table}: skipped ${skippedForMissingParent} row(s) whose parent row wasn't found in this import`);
          }

          // Insert in batches - use type assertion to avoid complex inference
          const batchSize = 100;
          let insertedCount = 0;
          const isParentTable = parentTablesNeeded.has(table);
          const newIdMap: Record<string, string> = {};

          for (let j = 0; j < rows.length; j += batchSize) {
            const batch = rows.slice(j, j + batchSize);
            // Deliberately NOT filtering out nulls here — this must stay
            // index-aligned with `batch` and the `data` rows Postgres hands
            // back, or a null earlier in the batch shifts every id pairing
            // after it by one.
            const batchOldIds = oldIds.slice(j, j + batchSize);

            if (table === 'user_preferences' || table === 'training_state') {
              const { error } = await (supabase.from(table) as any).upsert(batch, { onConflict: 'user_id' });
              if (error) errors.push(`Error importing ${table}: ${error.message}`);
              else insertedCount += batch.length;
            } else if (isParentTable) {
              // Need the freshly-generated ids back to remap dependent tables.
              const { data, error } = await (supabase.from(table) as any).insert(batch).select('id');
              if (error) {
                errors.push(`Error importing ${table}: ${error.message}`);
              } else {
                insertedCount += batch.length;
                (data ?? []).forEach((row: { id: string }, idx: number) => {
                  const oldId = batchOldIds[idx];
                  if (oldId) newIdMap[oldId] = row.id;
                });
              }
            } else {
              const { error } = await (supabase.from(table) as any).insert(batch);
              if (error) {
                errors.push(`Error importing ${table}: ${error.message}`);
              } else {
                insertedCount += batch.length;
              }
            }
          }

          if (isParentTable) idMaps[table] = newIdMap;
          imported[table] = insertedCount;
        } catch (err: any) {
          errors.push(`Failed to process ${table}: ${err.message}`);
        }
      }

      return {
        success: errors.length === 0,
        imported,
        errors
      };
    } finally {
      setIsImporting(false);
      setProgress({ current: 0, total: 0, table: '' });
    }
  };

  return {
    exportToCSV,
    exportAllData,
    importFromCSV,
    isExporting,
    isImporting,
    progress,
    lastExport,
    downloadLastExport,
    clearLastExport,
  };
}

function triggerBrowserDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  // Some browsers (especially mobile) handle blob downloads more reliably when opened in a new context.
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
