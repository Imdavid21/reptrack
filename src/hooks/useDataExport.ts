import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { CSV_SCHEMA, DATA_TABLES, TABLE_COLUMNS, type DataTable } from '@/lib/importers/csvSchema';
export { TABLE_COLUMNS, type DataTable };

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

export const LINKED_TABLES: Partial<Record<DataTable, { parentTable: DataTable; fkColumn: string }>> = {
  exercises: { parentTable: 'workouts', fkColumn: 'workout_id' },
  exercise_sets: { parentTable: 'workouts', fkColumn: 'workout_id' },
  habits: { parentTable: 'workouts', fkColumn: 'workout_id' },
  adaptive_session_logs: { parentTable: 'adaptive_lifecycles', fkColumn: 'lifecycle_id' },
  post_workout_checkins: { parentTable: 'workouts', fkColumn: 'workout_id' },
  workout_pauses: { parentTable: 'workouts', fkColumn: 'workout_id' },
};
export const REFERENCES: Partial<Record<DataTable, { column: string; parent: DataTable }[]>> = {
  ...Object.fromEntries(Object.entries(LINKED_TABLES).map(([table, link]) => [table, [{ column: link.fkColumn, parent: link.parentTable }]])),
  exercise_sets: [{ column: 'workout_id', parent: 'workouts' }, { column: 'template_id', parent: 'exercise_templates' }],
  workouts: [{ column: 'readiness_id', parent: 'readiness_checkins' }],
  calorie_burns: [{ column: 'activity_type', parent: 'workouts' }],
};
export const NUMERIC_FIELDS = new Set(Object.values(CSV_SCHEMA).flatMap(columns => Object.entries(columns).filter(([, type]) => type === 'number').map(([column]) => column)));
export const BOOLEAN_FIELDS = new Set(Object.values(CSV_SCHEMA).flatMap(columns => Object.entries(columns).filter(([, type]) => type === 'boolean').map(([column]) => column)));
const SINGLETONS = new Set<DataTable>(['user_preferences', 'training_state', 'advanced_settings']);

export function dependencyOrder(tables: DataTable[]): DataTable[] {
  const result: DataTable[] = [];
  const visit = (table: DataTable) => {
    if (result.includes(table)) return;
    for (const ref of REFERENCES[table] ?? []) visit(ref.parent);
    result.push(table);
  };
  tables.forEach(visit);
  return result;
}

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

export function escapeCSV(value: unknown): string {
  if (value == null) return '';
  // Preserve empty strings and literal backslashes without changing old CSVs.
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const encoded = text === '' ? '\\E' : text.startsWith('\\') ? '\\' + text : text;
  return /[,"\r\n]/.test(encoded) ? `"${encoded.replace(/"/g, '""')}"` : encoded;
}
export function parseCSVRows(content: string): string[][] {
  const parsed = Papa.parse<string[]>(content.replace(/^\uFEFF/, ''), { skipEmptyLines: 'greedy' });
  if (parsed.errors.length) throw new Error(`Invalid CSV: ${parsed.errors[0].message}`);
  return parsed.data;
}
export function parseCSVLine(line: string): string[] { return parseCSVRows(line)[0] ?? []; }

export function decodeCSVRow(table: DataTable, headers: string[], values: string[]): Record<string, any> {
  if (headers.length !== values.length) throw new Error(`${table}: expected ${headers.length} fields, received ${values.length}`);
  const schema: Record<string, string> = CSV_SCHEMA[table];
  const row: Record<string, any> = {};
  headers.forEach((header, index) => {
    if (!(header in schema)) throw new Error(`${table}: unknown column ${header}`);
    const value = values[index];
    if (value === '') { row[header] = null; return; }
    switch (schema[header]) {
      case 'number': {
        const number = Number(value);
        if (!Number.isFinite(number)) throw new Error(`${table}.${header}: invalid number "${value}"`);
        row[header] = number; break;
      }
      case 'boolean':
        if (!/^(true|false|1|0)$/i.test(value)) throw new Error(`${table}.${header}: invalid boolean`);
        row[header] = /^(true|1)$/i.test(value); break;
      case 'json': case 'array':
        try { row[header] = JSON.parse(value); } catch { throw new Error(`${table}.${header}: invalid JSON`); }
        if (schema[header] === 'array' && !Array.isArray(row[header])) throw new Error(`${table}.${header}: expected an array`);
        break;
      default: row[header] = value === '\\E' ? '' : value.startsWith('\\\\') ? value.slice(1) : value;
    }
  });
  return row;
}

export function parseCSVSections(text: string, filename: string): { table: DataTable; rows: Record<string, any>[] }[] {
  const parsed = parseCSVRows(text);
  const sections: { table: DataTable; rows: Record<string, any>[] }[] = [];
  let table: DataTable | undefined;
  let headers: string[] | undefined;
  const filenameTable = filename.replace(/\.csv$/i, '').toLowerCase();
  if (filenameTable in CSV_SCHEMA) table = filenameTable as DataTable;
  for (const fields of parsed) {
    const marker = fields.length === 1 ? fields[0].match(/^### TABLE: (\w+) ###$/) : null;
    if (marker) {
      if (!(marker[1] in CSV_SCHEMA)) throw new Error(`Unsupported table: ${marker[1]}`);
      table = marker[1] as DataTable; headers = undefined; continue;
    }
    if (!table) throw new Error('Could not determine table. Use a RepTrack export or a table-named CSV.');
    if (!headers) {
      headers = fields.map(value => value.trim());
      if (new Set(headers).size !== headers.length) throw new Error(`${table}: duplicate column headers`);
      if (headers.some(header => !TABLE_COLUMNS[table].includes(header))) throw new Error(`${table}: unknown column in header`);
      if (sections.some(section => section.table === table)) throw new Error(`Duplicate section: ${table}`);
      sections.push({ table, rows: [] });
    } else {
      const section = sections[sections.length - 1];
      if (section) section.rows.push(decodeCSVRow(table, headers, fields));
    }
  }
  if (!sections.length) throw new Error('The CSV is empty.');
  return sections;
}

export function useDataExport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
      const tables = dependencyOrder(options.tables);
      setProgress({ current: 0, total: tables.length, table: '' });
      const csvFiles: string[] = [];
      for (const [index, table] of tables.entries()) {
        setProgress({ current: index + 1, total: tables.length, table });
        const schema = CSV_SCHEMA[table];
        let data: Record<string, any>[] = [];
        if ('user_id' in schema) {
          data = await fetchAllPaged(async (from, to) => {
            const result = await (supabase.from(table) as any).select('*').eq('user_id', user.id).order('id' in schema ? 'id' : 'user_id').range(from, to);
            return result;
          });
        } else {
          const link = LINKED_TABLES[table];
          if (!link) throw new Error(`No ownership mapping for ${table}`);
          const parents = await fetchAllPaged<{ id: string }>(async (from, to) => (supabase.from(link.parentTable) as any).select('id').eq('user_id', user.id).order('id').range(from, to));
          for (let i = 0; i < parents.length; i += 100) {
            const ids = parents.slice(i, i + 100).map(row => row.id);
            data.push(...await fetchAllPaged<Record<string, any>>(async (from, to) => (supabase.from(table) as any).select('*').in(link.fkColumn, ids).order('id').range(from, to)));
          }
        }
        const columns = TABLE_COLUMNS[table];
        csvFiles.push(`### TABLE: ${table} ###\n${columns.join(',')}\n${data.map(row => columns.map(column => escapeCSV(row[column])).join(',')).join('\n')}`);
      }
      const exportContent = csvFiles.join('\n\n');
      const exportFilename = `fitness_data_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;

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
    return exportToCSV({ tables: DATA_TABLES });
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
    const idMaps: Partial<Record<DataTable, Record<string, string>>> = {};
    try {
      // Parse and validate the entire file before any database write.
      const sections = parseCSVSections(await file.text(), file.name);
      const order = dependencyOrder(sections.map(section => section.table));
      // Seed only IDs readable as this account. Standalone child CSVs can attach safely.
      for (const table of order) {
        if (!('id' in CSV_SCHEMA[table])) continue;
        const linked = LINKED_TABLES[table];
        const existing = await fetchAllPaged<{ id: string }>(async (from, to) => {
          let q = (supabase.from(table) as any).select('id');
          if ('user_id' in CSV_SCHEMA[table]) q = q.eq('user_id', user.id);
          // Linked-only tables are scoped by their existing RLS policies.
          else if (!linked) throw new Error(`No ownership mapping for ${table}`);
          return q.order('id').range(from, to);
        });
        idMaps[table] = Object.fromEntries(existing.map(row => [row.id, row.id]));
      }
      setProgress({ current: 0, total: sections.length, table: '' });
      let current = 0;
      for (const table of order) {
        const section = sections.find(item => item.table === table);
        if (!section) continue;
        setProgress({ current: ++current, total: sections.length, table });
        imported[table] = 0;
        for (const [index, original] of section.rows.entries()) {
          try {
            const row = { ...original };
            const oldId = row.id as string | undefined;
            if (oldId && idMaps[table]?.[oldId] && !SINGLETONS.has(table)) continue;
            delete row.id;
            if ('user_id' in CSV_SCHEMA[table]) row.user_id = user.id;
            else delete row.user_id;
            for (const ref of REFERENCES[table] ?? []) {
              const value = row[ref.column];
              const isBurn = table === 'calorie_burns';
              if (isBurn && (typeof value !== 'string' || !value.startsWith('workout:'))) continue;
              if (value == null) continue;
              const key = isBurn ? value.slice(8) : value;
              const mapped = idMaps[ref.parent]?.[key];
              if (!mapped) throw new Error(`Missing ${ref.parent} record for ${ref.column}`);
              row[ref.column] = isBurn ? `workout:${mapped}` : mapped;
            }
            if ('id' in CSV_SCHEMA[table]) row.id = crypto.randomUUID();
            const result = SINGLETONS.has(table)
              ? await (supabase.from(table) as any).upsert(Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'id')), { onConflict: 'user_id' })
              : await (supabase.from(table) as any).insert(row);
            if (result.error) throw result.error;
            if (oldId && row.id) {
              const map = idMaps[table] ?? {};
              map[oldId] = row.id; idMaps[table] = map;
            }
            imported[table]++;
          } catch (error: any) {
            errors.push(`${table} row ${index + 2}: ${error.message}`);
          }
        }
      }
      await queryClient.invalidateQueries();
      return { success: errors.length === 0, imported, errors };
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
