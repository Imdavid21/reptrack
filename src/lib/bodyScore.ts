/**
 * Body Overview engine - the "north star" synthesis layer.
 *
 * Pure functions that turn raw logs (workouts, meals, water, sleep, weight)
 * into: one overall body score, four pillar scores (Training / Fuel /
 * Recovery / Hydration), and a short list of concrete, data-grounded next
 * steps. Honesty rules baked in:
 *  - a pillar only gets a score when it has enough data (min sample sizes)
 *  - every output carries the day-count it was computed from
 *  - the overall score is renormalized over the pillars that actually exist
 */

export type PillarKey = 'training' | 'fuel' | 'recovery' | 'hydration';

export interface PillarResult {
  key: PillarKey;
  /** 0-100, or null when there isn't enough data to score honestly. */
  score: number | null;
  /** Human summary of the underlying number, e.g. "3.5 sessions/wk". */
  valueLabel: string;
  /** Days in the range that have data for this pillar. */
  daysWithData: number;
  /** First-half vs second-half direction within the range. */
  trend: 'up' | 'down' | 'flat';
}

export interface NextStep {
  id: string;
  pillar: PillarKey | 'body';
  title: string;
  /** One-line, number-grounded reason. */
  detail: string;
  /** In-app route for the CTA, if one applies. */
  route?: string;
  priority: number; // higher = more important
}

export interface BodyOverview {
  /** 0-100 composite, or null when no pillar has enough data. */
  overall: number | null;
  pillars: Record<PillarKey, PillarResult>;
  /** Distinct days in range with ANY logged data. */
  activeDays: number;
  rangeDays: number;
  nextSteps: NextStep[];
}

export interface BodyOverviewInput {
  rangeDays: number;
  goals: {
    weeklyWorkouts: number;
    dailyCalories: number | null;
    dailyProtein: number | null;
    /** Liters. Use normalizeWaterGoalLiters() on the stored preference. */
    dailyWaterLiters: number;
    sleepHours: number;
    weightGoalType: 'lose' | 'gain' | 'maintain' | null;
  };
  /** yyyy-MM-dd workout dates within the range. */
  workoutDates: string[];
  meals: Array<{ date: string; calories: number | null; protein: number | null }>;
  /** Liters per yyyy-MM-dd day. */
  waterByDay: Record<string, number>;
  metrics: Array<{ date: string; sleep_hours: number | null; bodyweight: number | null }>;
  /** Name of the next scheduled split day, for the training CTA. */
  nextDayName?: string;
  nextDayKey?: string;
}

export interface ScorePoint {
  date: string;
  score: number | null;
}

/**
 * Rolling overall-body-score series. For each window (one per day in the
 * range, each carrying its own trailing-window bounds) we slice the full data
 * and run the same scoring engine, so the trend line is exactly the headline
 * score computed day by day. Pure: date math happens in the caller.
 *
 * `resolveGoals` is called once per window with that window's end date, so a
 * goal change only affects windows from the date it was actually made -
 * without it, changing e.g. your protein target today would retroactively
 * repaint the whole trend line, including weeks before the change existed.
 */
export function computeScoreSeries(
  windows: Array<{ date: string; fromKey: string; toKey: string }>,
  data: {
    workoutDates: string[];
    meals: BodyOverviewInput['meals'];
    waterByDay: Record<string, number>;
    metrics: BodyOverviewInput['metrics'];
  },
  resolveGoals: (dateKey: string) => BodyOverviewInput['goals'],
  windowDays: number,
): ScorePoint[] {
  return windows.map((w) => {
    const inRange = (d?: string) => !!d && d >= w.fromKey && d <= w.toKey;
    const input: BodyOverviewInput = {
      rangeDays: windowDays,
      goals: resolveGoals(w.toKey),
      workoutDates: data.workoutDates.filter(inRange),
      meals: data.meals.filter((m) => inRange(m.date)),
      waterByDay: Object.fromEntries(Object.entries(data.waterByDay).filter(([d]) => inRange(d))),
      metrics: data.metrics.filter((m) => inRange(m.date)),
    };
    return { date: w.date, score: computeBodyOverview(input).overall };
  });
}

/**
 * The water goal preference has historically been written in liters in some
 * flows ("3") and milliliters in others ("3000"). Normalize to liters.
 */
export function normalizeWaterGoalLiters(raw: number | null | undefined): number {
  if (!raw || raw <= 0) return 3;
  return raw > 100 ? raw / 1000 : raw;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

/** Split a list of dated values into first/second half of the range by date order. */
function halfTrend(values: Array<{ date: string; v: number }>): 'up' | 'down' | 'flat' {
  if (values.length < 4) return 'flat';
  const sorted = [...values].sort((a, b) => a.date.localeCompare(b.date));
  const mid = Math.floor(sorted.length / 2);
  const avg = (xs: typeof sorted) => xs.reduce((s, x) => s + x.v, 0) / xs.length;
  const first = avg(sorted.slice(0, mid));
  const second = avg(sorted.slice(mid));
  if (first === 0) return second > 0 ? 'up' : 'flat';
  const change = (second - first) / Math.abs(first);
  if (change > 0.05) return 'up';
  if (change < -0.05) return 'down';
  return 'flat';
}

/**
 * Trend of training *frequency* across the range. Splits the date span into two
 * equal-time halves and compares how many sessions landed in each. Feeding
 * halfTrend a constant `v` per workout (as this used to) always yields 'flat'
 * because every value is identical; this compares real session counts instead.
 * All dates are parsed the same way, so the relative comparison is
 * timezone-agnostic.
 */
function sessionFrequencyTrend(dates: string[]): 'up' | 'down' | 'flat' {
  if (dates.length < 4) return 'flat';
  const times = dates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
  const span = times[times.length - 1] - times[0];
  if (span <= 0) return 'flat';
  const mid = times[0] + span / 2;
  const firstHalf = times.filter(t => t < mid).length;
  const secondHalf = times.length - firstHalf;
  if (firstHalf === 0) return secondHalf > 0 ? 'up' : 'flat';
  const change = (secondHalf - firstHalf) / firstHalf;
  if (change > 0.05) return 'up';
  if (change < -0.05) return 'down';
  return 'flat';
}

export function computeBodyOverview(input: BodyOverviewInput): BodyOverview {
  const { rangeDays, goals } = input;
  const weeks = Math.max(rangeDays / 7, 0.5);

  // ---- Training ----
  const workoutDays = new Set(input.workoutDates);
  const sessionsPerWeek = input.workoutDates.length / weeks;
  const trainingScore = input.workoutDates.length === 0
    ? (rangeDays >= 7 ? 0 : null)
    : Math.round(clamp((sessionsPerWeek / Math.max(goals.weeklyWorkouts, 1)) * 100));
  const training: PillarResult = {
    key: 'training',
    score: trainingScore,
    valueLabel: `${sessionsPerWeek.toFixed(1)} sessions/wk`,
    daysWithData: workoutDays.size,
    trend: sessionFrequencyTrend(input.workoutDates),
  };

  // ---- Fuel (nutrition) ----
  const mealsByDay = new Map<string, { calories: number; protein: number }>();
  for (const m of input.meals) {
    const day = mealsByDay.get(m.date) ?? { calories: 0, protein: 0 };
    day.calories += m.calories ?? 0;
    day.protein += m.protein ?? 0;
    mealsByDay.set(m.date, day);
  }
  const fuelDays = mealsByDay.size;
  let fuelScore: number | null = null;
  let fuelLabel = 'Not tracked yet';
  if (fuelDays >= 3) {
    const dayTotals = [...mealsByDay.values()];
    const avgCal = dayTotals.reduce((s, d) => s + d.calories, 0) / fuelDays;
    const avgProtein = dayTotals.reduce((s, d) => s + d.protein, 0) / fuelDays;
    const parts: number[] = [];
    if (goals.dailyProtein && goals.dailyProtein > 0) {
      parts.push(clamp((avgProtein / goals.dailyProtein) * 100));
    }
    if (goals.dailyCalories && goals.dailyCalories > 0) {
      // Closeness to target: full marks within ±10%, falling off beyond.
      const deviation = Math.abs(avgCal - goals.dailyCalories) / goals.dailyCalories;
      parts.push(clamp(100 - Math.max(0, deviation - 0.1) * 250));
    }
    // Tracking consistency keeps the score honest for sporadic loggers.
    parts.push(clamp((fuelDays / rangeDays) * 100));
    fuelScore = Math.round(parts.reduce((s, p) => s + p, 0) / parts.length);
    fuelLabel = `${Math.round(avgCal)} kcal · ${Math.round(avgProtein)}g protein avg`;
  } else if (fuelDays > 0) {
    fuelLabel = `Only ${fuelDays} day${fuelDays === 1 ? '' : 's'} tracked`;
  }
  const fuel: PillarResult = {
    key: 'fuel',
    score: fuelScore,
    valueLabel: fuelLabel,
    daysWithData: fuelDays,
    trend: halfTrend([...mealsByDay.entries()].map(([date, d]) => ({ date, v: d.protein }))),
  };

  // ---- Hydration ----
  const waterDays = Object.keys(input.waterByDay).length;
  let hydrationScore: number | null = null;
  let hydrationLabel = 'Not tracked yet';
  if (waterDays >= 3) {
    const avgLiters = Object.values(input.waterByDay).reduce((s, v) => s + v, 0) / waterDays;
    hydrationScore = Math.round(clamp((avgLiters / goals.dailyWaterLiters) * 100));
    hydrationLabel = `${avgLiters.toFixed(1)}L/day avg`;
  } else if (waterDays > 0) {
    hydrationLabel = `Only ${waterDays} day${waterDays === 1 ? '' : 's'} tracked`;
  }
  const hydration: PillarResult = {
    key: 'hydration',
    score: hydrationScore,
    valueLabel: hydrationLabel,
    daysWithData: waterDays,
    trend: halfTrend(Object.entries(input.waterByDay).map(([date, v]) => ({ date, v }))),
  };

  // ---- Recovery (sleep) ----
  const sleepEntries = input.metrics
    .filter(m => m.sleep_hours != null && m.sleep_hours > 0)
    .map(m => ({ date: m.date, v: m.sleep_hours as number }));
  let recoveryScore: number | null = null;
  let recoveryLabel = 'Not tracked yet';
  if (sleepEntries.length >= 3) {
    const avgSleep = sleepEntries.reduce((s, e) => s + e.v, 0) / sleepEntries.length;
    recoveryScore = Math.round(clamp((avgSleep / Math.max(goals.sleepHours, 1)) * 100));
    recoveryLabel = `${avgSleep.toFixed(1)}h sleep avg`;
  } else if (sleepEntries.length > 0) {
    recoveryLabel = `Only ${sleepEntries.length} night${sleepEntries.length === 1 ? '' : 's'} tracked`;
  }
  const recovery: PillarResult = {
    key: 'recovery',
    score: recoveryScore,
    valueLabel: recoveryLabel,
    daysWithData: sleepEntries.length,
    trend: halfTrend(sleepEntries),
  };

  // ---- Overall (renormalized over scored pillars) ----
  const weights: Record<PillarKey, number> = { training: 0.35, fuel: 0.25, recovery: 0.25, hydration: 0.15 };
  const pillars = { training, fuel, recovery, hydration };
  let weightSum = 0;
  let scoreSum = 0;
  (Object.keys(pillars) as PillarKey[]).forEach(k => {
    const p = pillars[k];
    if (p.score != null) {
      weightSum += weights[k];
      scoreSum += p.score * weights[k];
    }
  });
  const overall = weightSum > 0 ? Math.round(scoreSum / weightSum) : null;

  const allDays = new Set<string>([
    ...workoutDays,
    ...mealsByDay.keys(),
    ...Object.keys(input.waterByDay),
    ...sleepEntries.map(e => e.date),
  ]);

  const overview: BodyOverview = {
    overall,
    pillars,
    activeDays: allDays.size,
    rangeDays,
    nextSteps: [],
  };
  overview.nextSteps = buildNextSteps(overview, input);
  return overview;
}

function buildNextSteps(o: BodyOverview, input: BodyOverviewInput): NextStep[] {
  const steps: NextStep[] = [];
  const g = input.goals;
  const weeks = Math.max(input.rangeDays / 7, 0.5);

  // Training
  const perWeek = input.workoutDates.length / weeks;
  if (input.workoutDates.length === 0) {
    steps.push({
      id: 'first-workout',
      pillar: 'training',
      title: 'Log your first workout',
      detail: 'Everything else in the app builds on your training history.',
      route: '/app/log',
      priority: 100,
    });
  } else if (perWeek < g.weeklyWorkouts * 0.85) {
    const deficit = Math.max(1, Math.round((g.weeklyWorkouts - perWeek) * 10) / 10);
    steps.push({
      id: 'training-behind',
      pillar: 'training',
      title: input.nextDayName ? `Train ${input.nextDayName} today` : 'Get a session in today',
      detail: `You're averaging ${perWeek.toFixed(1)}/wk vs your ${g.weeklyWorkouts}/wk goal (≈${deficit} short).`,
      route: input.nextDayKey ? `/app/log?day=${encodeURIComponent(input.nextDayKey)}` : '/app/log',
      priority: 90,
    });
  }

  // Fuel
  const mealsByDay = new Map<string, { calories: number; protein: number }>();
  for (const m of input.meals) {
    const day = mealsByDay.get(m.date) ?? { calories: 0, protein: 0 };
    day.calories += m.calories ?? 0;
    day.protein += m.protein ?? 0;
    mealsByDay.set(m.date, day);
  }
  const fuelDays = mealsByDay.size;
  if (fuelDays >= 3 && g.dailyProtein && g.dailyProtein > 0) {
    const avgProtein = [...mealsByDay.values()].reduce((s, d) => s + d.protein, 0) / fuelDays;
    if (avgProtein < g.dailyProtein * 0.8) {
      const gap = Math.round(g.dailyProtein - avgProtein);
      steps.push({
        id: 'protein-low',
        pillar: 'fuel',
        title: `Add ~${gap}g protein per day`,
        detail: `Averaging ${Math.round(avgProtein)}g vs your ${g.dailyProtein}g goal. One extra protein-rich meal closes most of it.`,
        route: '/app',
        priority: 80,
      });
    }
  } else if (fuelDays > 0 && fuelDays < Math.min(input.rangeDays, 7) * 0.5) {
    steps.push({
      id: 'track-meals',
      pillar: 'fuel',
      title: 'Track meals more consistently',
      detail: `Only ${fuelDays} of the last ${input.rangeDays} days have meals logged - trends need ≥3 days/week.`,
      route: '/app',
      priority: 60,
    });
  }

  // Recovery
  const sleepEntries = input.metrics.filter(m => m.sleep_hours != null && m.sleep_hours > 0);
  if (sleepEntries.length >= 3) {
    const avgSleep = sleepEntries.reduce((s, e) => s + (e.sleep_hours as number), 0) / sleepEntries.length;
    if (avgSleep < g.sleepHours - 0.5) {
      const gapMin = Math.round((g.sleepHours - avgSleep) * 60);
      steps.push({
        id: 'sleep-short',
        pillar: 'recovery',
        title: `Move bedtime ~${gapMin} min earlier`,
        detail: `Sleep is averaging ${avgSleep.toFixed(1)}h vs your ${g.sleepHours}h goal - recovery limits strength gains.`,
        priority: 75,
      });
    }
  }

  // Hydration
  const waterDays = Object.keys(input.waterByDay).length;
  if (waterDays >= 3) {
    const avgLiters = Object.values(input.waterByDay).reduce((s, v) => s + v, 0) / waterDays;
    if (avgLiters < g.dailyWaterLiters * 0.8) {
      const gapMl = Math.round((g.dailyWaterLiters - avgLiters) * 1000 / 250) * 250;
      steps.push({
        id: 'water-low',
        pillar: 'hydration',
        title: `Drink ~${gapMl}ml more per day`,
        detail: `Averaging ${avgLiters.toFixed(1)}L vs your ${g.dailyWaterLiters.toFixed(1)}L goal - that's ${Math.max(1, Math.round(gapMl / 250))} more glasses.`,
        route: '/app',
        priority: 55,
      });
    }
  }

  // Bodyweight direction vs goal
  const weighIns = input.metrics
    .filter(m => m.bodyweight != null && m.bodyweight > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (weighIns.length >= 4 && g.weightGoalType && g.weightGoalType !== 'maintain') {
    const first = weighIns[0].bodyweight as number;
    const last = weighIns[weighIns.length - 1].bodyweight as number;
    const delta = last - first;
    const wrongWay = (g.weightGoalType === 'lose' && delta > 0.5) || (g.weightGoalType === 'gain' && delta < -0.5);
    if (wrongWay) {
      steps.push({
        id: 'weight-direction',
        pillar: 'body',
        title: g.weightGoalType === 'lose' ? 'Weight is trending up' : 'Weight is trending down',
        detail: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}kg over this period vs a "${g.weightGoalType}" goal - review your calorie target.`,
        route: '/app/insights',
        priority: 70,
      });
    }
  }

  return steps.sort((a, b) => b.priority - a.priority).slice(0, 4);
}
