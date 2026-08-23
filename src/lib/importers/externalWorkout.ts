export type ExternalWorkoutSource = 'strong' | 'hevy' | 'unknown';

export interface ExternalWorkoutSet {
  weight: number;
  reps: number;
  durationSeconds?: number;
  setType?: string;
}

export interface ExternalWorkoutExercise {
  name: string;
  sets: ExternalWorkoutSet[];
}

export interface ExternalWorkoutSession {
  source: ExternalWorkoutSource;
  date: string;
  workoutName: string;
  durationMinutes: number | null;
  exercises: ExternalWorkoutExercise[];
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim()); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some(value => value.length)) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(value => value.length)) rows.push(row);
  return rows;
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const first = (row: Record<string, string>, names: string[]) => names.map(name => row[normalize(name)]).find(value => value != null && value !== '') ?? '';
const number = (value: string) => {
  const n = Number.parseFloat(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function dateKey(value: string) {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const slash = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    const a = Number(slash[1]), b = Number(slash[2]);
    const month = a > 12 ? b : a;
    const day = a > 12 ? a : b;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  return '';
}

function durationMinutes(value: string, start: string, end: string) {
  if (value) {
    const hours = value.match(/(\d+(?:\.\d+)?)\s*h/i);
    const minutes = value.match(/(\d+(?:\.\d+)?)\s*m/i);
    if (hours || minutes) return Math.max(1, Math.round(number(hours?.[1] || '') * 60 + number(minutes?.[1] || '')));
    const numeric = number(value);
    if (numeric > 0) return Math.max(1, Math.round(numeric));
  }
  if (start && end) {
    const a = Date.parse(start), b = Date.parse(end);
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) return Math.max(1, Math.round((b - a) / 60000));
  }
  return null;
}

export function detectExternalWorkoutSource(headers: string[]): ExternalWorkoutSource {
  const normalized = headers.map(normalize);
  if (normalized.includes('exercise_name') && (normalized.includes('set_order') || normalized.includes('workout_name'))) return 'strong';
  if (normalized.includes('exercise_title') || normalized.includes('weight_kg') || normalized.includes('start_time')) return 'hevy';
  return 'unknown';
}

export function parseExternalWorkoutCSV(text: string): ExternalWorkoutSession[] {
  const rows = parseRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalize);
  const source = detectExternalWorkoutSource(rows[0]);
  const records = rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  const sessions = new Map<string, ExternalWorkoutSession>();

  for (const row of records) {
    const rawDate = first(row, ['date','start_time','start date','workout_date']);
    const date = dateKey(rawDate);
    const workoutName = first(row, ['workout_name','title','workout','routine_name']) || 'Imported workout';
    const exerciseName = first(row, ['exercise_name','exercise_title','exercise','movement']);
    if (!date || !exerciseName) continue;
    const start = first(row, ['start_time','start']);
    const end = first(row, ['end_time','end']);
    const duration = durationMinutes(first(row, ['duration','duration_minutes','workout_duration']), start, end);
    const key = `${date}|${workoutName}`;
    const session = sessions.get(key) ?? { source, date, workoutName, durationMinutes: duration, exercises: [] };
    if (session.durationMinutes == null && duration != null) session.durationMinutes = duration;
    let exercise = session.exercises.find(item => item.name.toLowerCase() === exerciseName.toLowerCase());
    if (!exercise) { exercise = { name: exerciseName, sets: [] }; session.exercises.push(exercise); }
    const weight = number(first(row, ['weight','weight_kg','load','kg']));
    const reps = number(first(row, ['reps','repetitions']));
    const durationSeconds = number(first(row, ['seconds','duration_seconds','set_duration_seconds']));
    const setType = first(row, ['set_type','type']);
    if (reps > 0 || weight > 0 || durationSeconds > 0) exercise.sets.push({ weight, reps, durationSeconds: durationSeconds || undefined, setType: setType || undefined });
    sessions.set(key, session);
  }

  return [...sessions.values()]
    .filter(session => session.exercises.some(exercise => exercise.sets.length))
    .sort((a, b) => a.date.localeCompare(b.date));
}
