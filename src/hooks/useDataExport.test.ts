import { describe, it, expect } from 'vitest';

// The exported module imports the Supabase client, which expects localStorage.
// These tests only exercise pure CSV helpers, so a minimal storage stub is enough.
if (typeof localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
    writable: true,
    configurable: true,
  });
}

const { escapeCSV, parseCSVLine, parseCSVRows, TABLE_COLUMNS, LINKED_TABLES, NUMERIC_FIELDS, BOOLEAN_FIELDS } = await import('./useDataExport');
import type { DataTable } from './useDataExport';

describe('escapeCSV / parseCSVLine round-trip', () => {
  it('round-trips a plain value unchanged', () => {
    const line = ['hello', '123', 'true'].map(escapeCSV).join(',');
    expect(parseCSVLine(line)).toEqual(['hello', '123', 'true']);
  });

  it('round-trips a value containing a comma', () => {
    const original = ['Chicken, grilled', '250'];
    const line = original.map(escapeCSV).join(',');
    expect(parseCSVLine(line)).toEqual(original);
  });

  it('round-trips a value containing a double quote', () => {
    const original = ['12" pizza slice', '400'];
    const line = original.map(escapeCSV).join(',');
    expect(parseCSVLine(line)).toEqual(original);
  });

  it('round-trips a value containing a newline', () => {
    const original = ['line one\nline two', '5'];
    const line = original.map(escapeCSV).join(',');
    expect(parseCSVLine(line)).toEqual(original);
  });

  it('round-trips an object value as its JSON string form', () => {
    const obj = { a: 1, b: 'two' };
    const line = escapeCSV(obj);
    expect(parseCSVLine(line)).toEqual([JSON.stringify(obj)]);
  });

  it('turns null/undefined into an empty field', () => {
    expect(escapeCSV(null)).toBe('');
    expect(escapeCSV(undefined)).toBe('');
  });

  it('keeps quoted multiline values in one imported row', () => {
    const content = 'name,notes\nMeal,"first line\nsecond line"\n';
    expect(parseCSVRows(content)).toEqual([
      ['name', 'notes'],
      ['Meal', 'first line\nsecond line'],
    ]);
  });
});

describe('TABLE_COLUMNS / NUMERIC_FIELDS / BOOLEAN_FIELDS consistency', () => {
  const allExportedColumns = new Set(Object.values(TABLE_COLUMNS).flat());

  it('every NUMERIC_FIELDS entry is actually exported by some table', () => {
    for (const field of NUMERIC_FIELDS) {
      expect(allExportedColumns.has(field)).toBe(true);
    }
  });

  it('every BOOLEAN_FIELDS entry is actually exported by some table', () => {
    for (const field of BOOLEAN_FIELDS) {
      expect(allExportedColumns.has(field)).toBe(true);
    }
  });

  it('every LINKED_TABLES foreign key column is present in that table\'s own column list', () => {
    for (const [table, link] of Object.entries(LINKED_TABLES) as [DataTable, { parentTable: DataTable; fkColumn: string }][]) {
      expect(TABLE_COLUMNS[table]).toContain(link.fkColumn);
    }
  });

  it('every LINKED_TABLES parentTable is a real, known table', () => {
    for (const link of Object.values(LINKED_TABLES) as { parentTable: DataTable; fkColumn: string }[]) {
      expect(TABLE_COLUMNS[link.parentTable]).toBeDefined();
    }
  });

  it('exports caffeine and occurrence time as part of each meal record', () => {
    expect(TABLE_COLUMNS.meals).toContain('caffeine_mg');
    expect(TABLE_COLUMNS.meals).toContain('consumed_at');
    expect(NUMERIC_FIELDS.has('caffeine_mg')).toBe(true);
    expect((TABLE_COLUMNS as Record<string, string[]>).caffeine_logs).toBeUndefined();
  });

  it('exports workout and activity occurrence timestamps', () => {
    expect(TABLE_COLUMNS.workouts).toEqual(expect.arrayContaining(['started_at', 'completed_at']));
    expect(TABLE_COLUMNS.calorie_burns).toEqual(expect.arrayContaining(['started_at', 'ended_at']));
  });

  it('exports and parses the caffeine limit as a numeric preference', () => {
    expect(TABLE_COLUMNS.user_preferences).toContain('daily_caffeine_limit');
    expect(NUMERIC_FIELDS.has('daily_caffeine_limit')).toBe(true);
  });
});
