import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export type DataTable = 
  | 'workouts'
  | 'exercises'
  | 'exercise_sets'
  | 'daily_metrics'
  | 'water_logs'
  | 'meals'
  | 'calorie_burns'
  | 'habits'
  | 'recovery_metrics'
  | 'custom_routines'
  | 'user_preferences'
  | 'exercise_templates'
  | 'deload_weeks';

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

// Column mappings for each table
const TABLE_COLUMNS: Record<DataTable, string[]> = {
  workouts: [
    'id', 'user_id', 'date', 'day', 'day_name', 'week_number',
    'started_at', 'completed_at', 'workout_duration_minutes',
    'pre_energy', 'pre_motivation', 'pre_soreness',
    'post_difficulty', 'post_satisfaction', 'is_skipped', 'created_at'
  ],
  exercises: [
    'id', 'workout_id', 'name', 'category', 'sort_order',
    'target_weight', 'target_reps', 'actual_weight', 'actual_reps',
    'completed'
  ],
  exercise_sets: [
    'id', 'workout_id', 'exercise_name', 'exercise_category', 
    'movement_pattern', 'primary_muscles', 'set_number',
    'target_weight', 'target_reps', 'actual_weight', 'actual_reps',
    'completed', 'created_at'
  ],
  daily_metrics: [
    'id', 'user_id', 'date', 'sleep_hours', 'energy_level', 'bodyweight',
    'pullups', 'is_rest_day', 'supplements', 'notes', 'created_at', 'updated_at'
  ],
  water_logs: [
    'id', 'user_id', 'timestamp', 'amount', 'method'
  ],
  meals: [
    'id', 'user_id', 'date', 'meal_type', 'food_name', 'calories',
    'protein', 'carbs', 'fat', 'fiber', 'food_quality',
    'photo_url', 'ai_detected_food', 'ai_confidence', 'is_confirmed', 'notes', 'created_at'
  ],
  calorie_burns: [
    'id', 'user_id', 'date', 'calories', 'source', 'activity_type',
    'duration_minutes', 'created_at'
  ],
  habits: [
    'id', 'workout_id', 'pullups', 'water_intake', 'sleep_hours',
    'energy_level', 'bodyweight', 'supplements', 'notes'
  ],
  recovery_metrics: [
    'id', 'user_id', 'date', 'recovery_score', 'hrv_ms', 'resting_hr',
    'sleep_quality', 'muscle_soreness', 'fatigue_level', 'stress_level',
    'workout_readiness', 'deload_recommended', 'notes', 'created_at', 'updated_at'
  ],
  custom_routines: [
    'id', 'user_id', 'routine_name', 'routine_data', 'is_active', 'created_at'
  ],
  user_preferences: [
    'id', 'user_id', 'age', 'gender', 'height_cm', 'activity_level',
    'units_system', 'weight_goal_type', 'weight_goal', 'sleep_goal',
    'weekly_workout_goal', 'daily_calorie_goal', 'daily_water_goal',
    'onboarding_completed', 'routine_setup_completed', 'rest_days',
    'training_split', 'dietary_preferences', 'fitness_goal',
    'created_at', 'updated_at'
  ],
  exercise_templates: [
    'id', 'user_id', 'name', 'canonical_name', 'category', 'equipment',
    'movement_pattern', 'primary_muscles', 'secondary_muscles',
    'default_reps', 'default_weight', 'version', 'deprecated_at',
    'created_at', 'updated_at'
  ],
  deload_weeks: [
    'id', 'user_id', 'week_start', 'week_end', 'trigger_reason',
    'volume_reduction_percent', 'intensity_reduction_percent',
    'fatigue_indicators', 'completed', 'notes', 'created_at'
  ],
};

// Tables that link via workout_id instead of user_id
const WORKOUT_LINKED_TABLES: DataTable[] = ['exercise_sets', 'exercises', 'habits'];

const TABLE_ORDER_BY: Record<DataTable, { column: string; ascending: boolean } | null> = {
  workouts: { column: 'date', ascending: true },
  exercises: { column: 'sort_order', ascending: true },
  exercise_sets: { column: 'created_at', ascending: true },
  daily_metrics: { column: 'date', ascending: true },
  water_logs: { column: 'timestamp', ascending: true },
  meals: { column: 'date', ascending: true },
  calorie_burns: { column: 'date', ascending: true },
  habits: null,
  recovery_metrics: { column: 'date', ascending: true },
  custom_routines: { column: 'created_at', ascending: true },
  user_preferences: { column: 'created_at', ascending: true },
  exercise_templates: { column: 'created_at', ascending: true },
  deload_weeks: { column: 'week_start', ascending: true },
};

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

function escapeCSV(value: any): string {
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

function parseCSVLine(line: string): string[] {
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
        let error: any = null;
        
        // Handle tables that don't have direct user_id (they link via workout_id)
        if (WORKOUT_LINKED_TABLES.includes(table)) {
          // Get all workout IDs for this user first
          const workouts = await fetchAllPaged<{ id: string }>(async (from, to) => {
            const result = await supabase
              .from('workouts')
              .select('id')
              .eq('user_id', user.id)
              .order('date', { ascending: true })
              .range(from, to);
            return { data: result.data ?? null, error: result.error };
          });

          if (workouts.length > 0) {
            const workoutIds = workouts.map(w => w.id);
            const chunkSize = 100;
            const allRows: Record<string, any>[] = [];

            for (let c = 0; c < workoutIds.length; c += chunkSize) {
              const chunk = workoutIds.slice(c, c + chunkSize);
              const orderBy = TABLE_ORDER_BY[table];

              const rowsForChunk = await fetchAllPaged<Record<string, any>>(async (from, to) => {
                let q = (supabase.from(table) as any).select('*').in('workout_id', chunk);
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
      'exercise_sets', 
      'daily_metrics',
      'water_logs',
      'meals',
      'calorie_burns',
      'habits',
      'recovery_metrics',
      'custom_routines',
      'user_preferences',
      'exercise_templates',
      'deload_weeks',
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
    
    try {
      const text = await file.text();
      const sections = text.split(/### TABLE: (\w+) ###\n/).filter(Boolean);
      
      // Handle single table CSV or combined export
      let tablesToProcess: { table: DataTable; content: string }[] = [];
      
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
      
      setProgress({ current: 0, total: tablesToProcess.length, table: '' });
      
      for (let i = 0; i < tablesToProcess.length; i++) {
        const { table, content } = tablesToProcess[i];
        setProgress({ current: i + 1, total: tablesToProcess.length, table });
        
        try {
          const lines = content.split('\n').filter(line => line.trim());
          if (lines.length < 2) continue;
          
          const headers = parseCSVLine(lines[0]);
          const rows = lines.slice(1).map(line => {
            const values = parseCSVLine(line);
            const row: Record<string, any> = {};
            
            headers.forEach((header, idx) => {
              let value: any = values[idx];
              
              // Skip id fields (let DB generate new ones)
              if (header === 'id' || header === 'workout_id') {
                return;
              }
              
              // Parse special types
              if (value === '') {
                value = null;
              } else if (header === 'supplements' || header.includes('muscles') || header === 'fatigue_indicators') {
                try { value = JSON.parse(value); } catch { /* keep as string */ }
              } else if (['completed', 'is_rest_day', 'is_confirmed', 'is_skipped', 'deload_recommended'].includes(header)) {
                value = value === 'true' || value === '1';
              } else if ([
                'actual_weight', 'actual_reps', 'target_weight', 'target_reps',
                'sleep_hours', 'energy_level', 'bodyweight', 'pullups',
                'calories', 'protein', 'carbs', 'fat', 'fiber',
                'amount', 'steps', 'water_intake', 'sort_order',
                'pre_energy', 'pre_motivation',
                'pre_soreness', 'post_difficulty', 'post_satisfaction',
                'workout_duration_minutes', 'week_number', 'set_number', 'ai_confidence',
                'recovery_score', 'hrv_ms', 'resting_hr', 'sleep_quality',
                'muscle_soreness', 'fatigue_level', 'stress_level', 'workout_readiness',
                'volume_reduction_percent', 'intensity_reduction_percent', 'duration_minutes'
              ].includes(header)) {
                value = value ? parseFloat(value) : null;
              }
              
              row[header] = value;
            });
            
            // Add user_id to all rows
            row.user_id = user.id;
            
            return row;
          });
          
          // Insert in batches - use type assertion to avoid complex inference
          const batchSize = 100;
          let insertedCount = 0;
          
          for (let j = 0; j < rows.length; j += batchSize) {
            const batch = rows.slice(j, j + batchSize);
            const { error } = await (supabase.from(table) as any).insert(batch);
            
            if (error) {
              errors.push(`Error importing ${table}: ${error.message}`);
            } else {
              insertedCount += batch.length;
            }
          }
          
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
