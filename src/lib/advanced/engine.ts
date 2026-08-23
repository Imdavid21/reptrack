import { getBodyPart } from '@/lib/exerciseClassification';

export interface AdvancedSet {
  exercise: string;
  date: string;
  weight: number;
  reps: number;
  rir?: number | null;
  pain?: number | null;
}

export interface WeightPoint { date: string; bodyweight: number | null }

const round = (value: number, places = 1) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export function estimated1RM(weight: number, reps: number) {
  if (!weight || !reps) return 0;
  return weight * (1 + Math.min(reps, 15) / 30);
}

export function progressionAutopilot(sets: AdvancedSet[]) {
  const grouped = new Map<string, AdvancedSet[]>();
  sets.filter(set => set.weight > 0 && set.reps > 0 && set.date).forEach(set => {
    const list = grouped.get(set.exercise) ?? [];
    list.push(set);
    grouped.set(set.exercise, list);
  });

  return [...grouped.entries()].map(([exercise, rows]) => {
    const dates = [...new Set(rows.map(row => row.date))].sort();
    const latestDate = dates.at(-1)!;
    const priorDate = dates.at(-2);
    const latest = rows.filter(row => row.date === latestDate).sort((a, b) => estimated1RM(b.weight, b.reps) - estimated1RM(a.weight, a.reps))[0];
    const prior = priorDate ? rows.filter(row => row.date === priorDate).sort((a, b) => estimated1RM(b.weight, b.reps) - estimated1RM(a.weight, a.reps))[0] : null;
    const latestE1rm = estimated1RM(latest.weight, latest.reps);
    const priorE1rm = prior ? estimated1RM(prior.weight, prior.reps) : null;
    const changePct = priorE1rm ? ((latestE1rm - priorE1rm) / priorE1rm) * 100 : null;
    const state = priorE1rm == null ? 'learning' : changePct! >= 1.5 ? 'progressing' : changePct! <= -3 ? 'regressed' : 'stable';
    const nextWeight = state === 'progressing' && latest.reps >= 8 ? round(latest.weight + (latest.weight >= 40 ? 2.5 : 1), 2) : latest.weight;
    return { exercise, bodyPart: getBodyPart(exercise), latestDate, latestWeight: latest.weight, latestReps: latest.reps, changePct: changePct == null ? null : round(changePct, 1), state, nextWeight };
  }).sort((a, b) => (a.state === 'regressed' ? -1 : 0) - (b.state === 'regressed' ? -1 : 0) || a.exercise.localeCompare(b.exercise));
}

export function weakPointRadar(sets: AdvancedSet[], specialization: string[] = []) {
  const recent = sets.filter(set => set.date);
  const byPart = new Map<string, { sets: number; loadReps: number }>();
  for (const set of recent) {
    const part = getBodyPart(set.exercise);
    const current = byPart.get(part) ?? { sets: 0, loadReps: 0 };
    current.sets += 1;
    current.loadReps += set.weight * set.reps;
    byPart.set(part, current);
  }
  const maxSets = Math.max(1, ...[...byPart.values()].map(value => value.sets));
  return [...byPart.entries()].map(([bodyPart, value]) => ({
    bodyPart,
    sets: value.sets,
    exposure: round(value.sets / maxSets, 2),
    specialized: specialization.some(name => name.toLowerCase() === bodyPart.toLowerCase()),
  })).sort((a, b) => Number(b.specialized) - Number(a.specialized) || a.sets - b.sets);
}

export function weightTrend(points: WeightPoint[]) {
  const valid = points.filter((point): point is { date: string; bodyweight: number } => typeof point.bodyweight === 'number' && point.bodyweight > 0).sort((a, b) => a.date.localeCompare(b.date));
  if (!valid.length) return { latest: null, weeklyRate: null, samples: 0 };
  const trailing = valid.slice(-7);
  const latest = trailing.reduce((sum, point) => sum + point.bodyweight, 0) / trailing.length;
  if (valid.length < 4) return { latest: round(latest, 2), weeklyRate: null, samples: valid.length };
  const first = valid[0];
  const last = valid.at(-1)!;
  const days = Math.max(1, (Date.parse(`${last.date}T12:00:00Z`) - Date.parse(`${first.date}T12:00:00Z`)) / 86400000);
  return { latest: round(latest, 2), weeklyRate: round(((last.bodyweight - first.bodyweight) / days) * 7, 2), samples: valid.length };
}

export function goalRunway(points: WeightPoint[], target: number | null | undefined) {
  const trend = weightTrend(points);
  if (trend.latest == null || target == null || trend.weeklyRate == null || Math.abs(trend.weeklyRate) < 0.05) return { ...trend, target: target ?? null, weeks: null, status: 'insufficient' as const };
  const remaining = target - trend.latest;
  if (Math.abs(remaining) < 0.2) return { ...trend, target, weeks: 0, status: 'reached' as const };
  if (Math.sign(remaining) !== Math.sign(trend.weeklyRate)) return { ...trend, target, weeks: null, status: 'off_course' as const };
  const weeks = Math.abs(remaining / trend.weeklyRate);
  return { ...trend, target, weeks: round(weeks, 1), status: weeks > 52 ? 'long' as const : 'on_course' as const };
}

export function cutControl(points: WeightPoint[], target: number | null | undefined, desiredWeeklyRate = -0.5) {
  const runway = goalRunway(points, target);
  const rate = runway.weeklyRate;
  const band = rate == null ? 'learning' : rate > 0.1 ? 'gaining' : rate < desiredWeeklyRate * 1.5 ? 'fast' : rate > desiredWeeklyRate * 0.5 ? 'slow' : 'on_track';
  return { ...runway, desiredWeeklyRate, band };
}

export function deloadSignal(input: { sleep: number[]; readiness: Array<number | null>; progression: ReturnType<typeof progressionAutopilot>; workouts14d: number }) {
  const sleep = input.sleep.filter(value => value > 0);
  const avgSleep = sleep.length ? sleep.reduce((sum, value) => sum + value, 0) / sleep.length : null;
  const readiness = input.readiness.filter((value): value is number => typeof value === 'number');
  const avgReadiness = readiness.length ? readiness.reduce((sum, value) => sum + value, 0) / readiness.length : null;
  const regressions = input.progression.filter(item => item.state === 'regressed').length;
  const evidence = [avgSleep != null && avgSleep < 6.5, avgReadiness != null && avgReadiness < 45, regressions >= 2, input.workouts14d >= 11].filter(Boolean).length;
  return { suggested: evidence >= 2, evidence, avgSleep: avgSleep == null ? null : round(avgSleep, 1), avgReadiness: avgReadiness == null ? null : round(avgReadiness, 0), regressions };
}

export function recoveryPattern(sleepByDate: Array<{ date: string; sleep: number | null }>) {
  const rows = sleepByDate.filter((row): row is { date: string; sleep: number } => typeof row.sleep === 'number' && row.sleep > 0).sort((a, b) => a.date.localeCompare(b.date));
  const recent = rows.slice(-7);
  const previous = rows.slice(-14, -7);
  const avg = (list: typeof rows) => list.length ? list.reduce((sum, row) => sum + row.sleep, 0) / list.length : null;
  const current = avg(recent), prior = avg(previous);
  return { current: current == null ? null : round(current, 1), previous: prior == null ? null : round(prior, 1), delta: current != null && prior != null ? round(current - prior, 1) : null, nights: recent.length };
}

export function warmupAutopilot(targetWeight: number, targetReps: number) {
  if (!targetWeight || targetWeight <= 0) return [{ weight: 0, reps: Math.min(10, Math.max(5, targetReps)), label: 'easy' }];
  const candidates = [
    { ratio: 0.4, reps: 8 },
    { ratio: 0.6, reps: 5 },
    { ratio: 0.8, reps: 3 },
  ];
  return candidates.filter(item => targetWeight * item.ratio >= 5).map(item => ({ weight: Math.round((targetWeight * item.ratio) / 2.5) * 2.5, reps: item.reps, label: `${Math.round(item.ratio * 100)}%` }));
}

export function sessionVolumePlan(plannedSets: number, modifier: number, override?: number | null) {
  const effective = override ?? modifier;
  return { plannedSets, modifier: effective, targetSets: Math.max(1, Math.round(plannedSets * effective)) };
}

export function exerciseWhy(name: string, specialization: string[] = []) {
  const part = getBodyPart(name);
  if (specialization.some(item => item.toLowerCase() === part.toLowerCase())) return `${part} priority`;
  if (/bench|press|squat|deadlift|row|pull.?up|pulldown/i.test(name)) return `${part} compound`;
  return `${part} volume`;
}

export function sessionQuality(input: { completedSets: number; plannedSets: number; progressionWins: number; regressions: number; painFlags?: number; durationMinutes?: number | null }) {
  const completion = input.plannedSets ? input.completedSets / input.plannedSets : 0;
  const flags: string[] = [];
  if (completion >= 0.9) flags.push('plan hit');
  else if (completion >= 0.65) flags.push('partial');
  else flags.push('short');
  if (input.progressionWins > 0) flags.push(`${input.progressionWins} progression`);
  if (input.regressions > 0) flags.push(`${input.regressions} regression`);
  if ((input.painFlags || 0) > 0) flags.push('pain flag');
  return { completion: round(completion * 100, 0), flags, review: input.regressions >= 2 || (input.painFlags || 0) > 0 || completion < 0.65 };
}

export interface MealHistoryRow { food_name: string | null; meal_type: string | null; calories: number | null; protein: number | null; carbs?: number | null; fat?: number | null; date: string }

export function mealSuggestions(rows: MealHistoryRow[], mealType?: string, limit = 5) {
  const normalized = rows.filter(row => row.food_name && (!mealType || row.meal_type === mealType));
  const groups = new Map<string, { label: string; count: number; calories: number[]; protein: number[]; carbs: number[]; fat: number[]; lastDate: string }>();
  for (const row of normalized) {
    const key = row.food_name!.trim().toLowerCase().replace(/\s+/g, ' ');
    const group = groups.get(key) ?? { label: row.food_name!.trim(), count: 0, calories: [], protein: [], carbs: [], fat: [], lastDate: row.date };
    group.count += 1;
    if (row.calories != null) group.calories.push(Number(row.calories));
    if (row.protein != null) group.protein.push(Number(row.protein));
    if (row.carbs != null) group.carbs.push(Number(row.carbs));
    if (row.fat != null) group.fat.push(Number(row.fat));
    if (row.date > group.lastDate) group.lastDate = row.date;
    groups.set(key, group);
  }
  const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return [...groups.values()].sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate)).slice(0, limit).map(group => ({ label: group.label, count: group.count, calories: Math.round(mean(group.calories)), protein: Math.round(mean(group.protein)), carbs: Math.round(mean(group.carbs)), fat: Math.round(mean(group.fat)) }));
}

export function plateLoad(targetKg: number, barKg = 20, plateDenominations = [25,20,15,10,5,2.5,1.25]) {
  const targetPerSide = Math.max(0, (targetKg - barKg) / 2);
  let remaining = targetPerSide;
  const perSide: number[] = [];
  const sorted = [...new Set(plateDenominations.filter(value => value > 0))].sort((a, b) => b - a);
  for (const plate of sorted) {
    while (remaining + 0.0001 >= plate) {
      perSide.push(plate);
      remaining = round(remaining - plate, 3);
    }
  }
  const loaded = barKg + perSide.reduce((sum, plate) => sum + plate * 2, 0);
  return { targetKg, barKg, perSide, loadedKg: round(loaded, 2), deltaKg: round(targetKg - loaded, 2) };
}

export function simulateCut(input: { currentWeight: number; targetWeight: number; dailyDeficit: number; maintenance: number }) {
  const kgToLose = Math.max(0, input.currentWeight - input.targetWeight);
  const weeklyRate = Math.max(0, (input.dailyDeficit * 7) / 7700);
  const weeks = weeklyRate > 0 ? kgToLose / weeklyRate : null;
  return { calories: Math.max(800, Math.round(input.maintenance - input.dailyDeficit)), weeklyRate: round(-weeklyRate, 2), weeks: weeks == null ? null : round(weeks, 1) };
}
