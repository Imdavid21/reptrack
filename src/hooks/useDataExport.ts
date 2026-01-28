import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export type DataTable = 
  | 'workouts'
  | 'exercise_sets'
  | 'daily_metrics'
  | 'morning_checkins'
  | 'night_checkins'
  | 'water_logs'
  | 'meals';

interface ExportOptions {
  tables: DataTable[];
  dateFrom?: Date;
  dateTo?: Date;
}

// Column mappings for each table
const TABLE_COLUMNS: Record<DataTable, string[]> = {
  workouts: [
    'id', 'date', 'day', 'day_name', 'week_number',
    'started_at', 'completed_at', 'workout_duration_minutes',
    'pre_energy', 'pre_motivation', 'pre_soreness',
    'post_difficulty', 'post_satisfaction', 'created_at'
  ],
  exercise_sets: [
    'id', 'workout_id', 'exercise_name', 'exercise_category', 
    'movement_pattern', 'primary_muscles', 'set_number',
    'target_weight', 'target_reps', 'actual_weight', 'actual_reps',
    'completed', 'created_at'
  ],
  daily_metrics: [
    'id', 'date', 'sleep_hours', 'energy_level', 'bodyweight',
    'pullups', 'supplements', 'is_rest_day', 'notes', 'created_at'
  ],
  morning_checkins: [
    'id', 'date', 'sleep_time', 'wake_time', 'sleep_hours',
    'energy_level', 'heart_rate', 'oxygen_level', 'bodyweight',
    'notes', 'created_at'
  ],
  night_checkins: [
    'id', 'date', 'performance_score', 'energy_score', 'steps',
    'bodyweight', 'is_rest_day', 'notes', 'created_at'
  ],
  water_logs: [
    'id', 'timestamp', 'amount', 'method'
  ],
  meals: [
    'id', 'date', 'meal_type', 'food_name', 'calories',
    'protein', 'carbs', 'fat', 'fiber', 'food_quality',
    'ai_detected_food', 'ai_confidence', 'notes', 'created_at'
  ],
};

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

  const exportToCSV = async (options: ExportOptions): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    
    setIsExporting(true);
    setProgress({ current: 0, total: options.tables.length, table: '' });
    
    try {
      const csvFiles: { name: string; content: string }[] = [];
      
      for (let i = 0; i < options.tables.length; i++) {
        const table = options.tables[i];
        setProgress({ current: i + 1, total: options.tables.length, table });
        
        // Build query - cast to any to avoid complex type inference issues
        const query = (supabase.from(table) as any).select('*').eq('user_id', user.id);
        const { data, error } = await query.order('created_at', { ascending: true }) as { 
          data: Record<string, any>[] | null; 
          error: any;
        };
        
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
      
      // Create and download ZIP-like combined file or individual CSVs
      if (csvFiles.length === 1) {
        downloadFile(csvFiles[0].content, csvFiles[0].name, 'text/csv');
      } else if (csvFiles.length > 1) {
        // Download as combined file with table markers
        const combined = csvFiles.map(f => 
          `### TABLE: ${f.name.replace('.csv', '')} ###\n${f.content}`
        ).join('\n\n');
        downloadFile(combined, `fitness_data_export_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
      }
    } finally {
      setIsExporting(false);
      setProgress({ current: 0, total: 0, table: '' });
    }
  };

  const exportAllData = async (): Promise<void> => {
    const allTables: DataTable[] = [
      'workouts',
      'exercise_sets', 
      'daily_metrics',
      'morning_checkins',
      'night_checkins',
      'water_logs',
      'meals'
    ];
    
    await exportToCSV({ tables: allTables });
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
              } else if (header.includes('supplements') || header.includes('muscles')) {
                try { value = JSON.parse(value); } catch { /* keep as string */ }
              } else if (['completed', 'is_rest_day', 'is_confirmed'].includes(header)) {
                value = value === 'true' || value === '1';
              } else if ([
                'actual_weight', 'actual_reps', 'target_weight', 'target_reps',
                'sleep_hours', 'energy_level', 'bodyweight', 'pullups',
                'calories', 'protein', 'carbs', 'fat', 'fiber',
                'amount', 'heart_rate', 'oxygen_level', 'steps',
                'performance_score', 'energy_score', 'pre_energy', 'pre_motivation',
                'pre_soreness', 'post_difficulty', 'post_satisfaction',
                'workout_duration_minutes', 'week_number', 'set_number', 'ai_confidence'
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
  };
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
