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

// Regression coverage for the class of bug this file has had before
// (usePersonalRecords-style drift): TABLE_COLUMNS silently falling behind
// the real schema meant "export all my data" quietly dropped whole feature
// areas (every Deficit Mode / Adaptive Mode field, workout check-in fields,
// calorie_burns.distance_km). This doesn't check against the live DB schema,
// but it locks in that every column NUMERIC_FIELDS/BOOLEAN_FIELDS know how to
// parse is actually one this file claims to export - so a future column
// added to one list isn't silently forgotten in the other.
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
});

describe('full CSV row decoding', () => {
  it('keeps text weights as text and restores JSON plus array columns', async () => {
    const { parseCSVSections } = await import('./useDataExport');
    const csv = '### TABLE: exercises ###\nid,workout_id,name,actual_weight,actual_reps,prescription\ne1,w1,Bench (Set 1),BW,45s,"{""sets"":3}"\n### TABLE: gym_profiles ###\nid,name,plates_kg,is_default,bar_weight_kg\ng1,Home,"[20,10,5]",true,20';
    const [exercises, gyms] = parseCSVSections(csv, 'export.csv');
    expect(exercises.rows[0]).toMatchObject({ actual_weight: 'BW', actual_reps: '45s', prescription: { sets: 3 } });
    expect(gyms.rows[0]).toMatchObject({ plates_kg: [20, 10, 5], is_default: true, bar_weight_kg: 20 });
  });

  it('includes set-level and settings tables in the export catalog', () => {
    expect(TABLE_COLUMNS.exercise_sets).toContain('template_snapshot');
    expect(TABLE_COLUMNS.advanced_settings).toContain('specialization_muscles');
    expect(TABLE_COLUMNS.workouts).toContain('readiness_id');
  });

  it('gives the same source id the same destination id', async () => {
    const { importRecordId } = await import('./useDataExport');
    expect(await importRecordId('u', 'w1')).toBe(await importRecordId('u', 'w1'));
  });
});
