/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, addDays } from 'date-fns';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';
import { supabase } from '@/integrations/supabase/client';
import { localDateKey } from '@/lib/dateKey';
import {
  ActivityObservation,
  buildDailyEnergyModel,
  calibrateEnergyModel,
  CalibrationDay,
  DailyEnergyModel,
  effectiveWeightAt,
  EnergyConfidence,
  ENERGY_MODEL_VERSION,
  estimateActivity,
  estimateWorkoutEnergy,
  nonexerciseBaselineFactor,
  calculateRee,
  ageOnDate,
  WeightObservation,
} from '@/lib/energyEngineV3';
import { workoutIntensityOverride } from '@/lib/workoutCalories';

interface EnergyBreakdown {
  normalDay: number;
  workout: number;
  walking: number;
  running: number;
  cycling: number;
  boxing: number;
  other: number;
  expenditure: number;
  food: number;
  balance: number;
}

interface EnergyModelResult {
  model: DailyEnergyModel | null;
  breakdown: EnergyBreakdown;
  calibration: ReturnType<typeof calibrateEnergyModel> | null;
  isLoading: boolean;
  hasProfileInputs: boolean;
}

const emptyBreakdown: EnergyBreakdown = { normalDay: 0, workout: 0, walking: 0, running: 0, cycling: 0, boxing: 0, other: 0, expenditure: 0, food: 0, balance: 0 };
const unavailable = (error: any) => error?.code === 'PGRST205' || /schema cache|does not exist/i.test(error?.message || '');
const timingFromWorkout = (workout: any) => {
  const start = workout.started_at ? new Date(workout.started_at).getTime() : NaN;
  const finish = workout.completed_at ? new Date(workout.completed_at).getTime() : NaN;
  if (Number.isFinite(start) && Number.isFinite(finish)) {
    return { elapsedMinutes: Math.max(0, (finish - start) / 60000), pausedSeconds: Number(workout.explicit_pause_seconds) || 0 };
  }
  // Legacy stored duration is already active duration, so there is no pause
  // to subtract again when timestamps are unavailable.
  return { elapsedMinutes: Math.max(0, Number(workout.workout_duration_minutes) || 0), pausedSeconds: 0 };
};

export function useEnergyModel(referenceDate: Date = new Date()): EnergyModelResult {
  const { user } = useAuth();
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();
  const date = localDateKey(referenceDate);
  const from = localDateKey(subDays(referenceDate, 365));
  const to = localDateKey(addDays(referenceDate, 14));

  const query = useQuery({
    queryKey: ['energy-model-v3-inputs', user?.id, date],
    queryFn: async () => {
      if (!user) return null;
      const [weights, meals, burns, workouts, previousState, previousTarget] = await Promise.all([
        supabase.from('daily_metrics').select('date,bodyweight').eq('user_id', user.id).gte('date', from).lte('date', to).not('bodyweight', 'is', null).order('date'),
        supabase.from('meals').select('date,meal_type,calories,is_confirmed,created_at').eq('user_id', user.id).gte('date', from).lte('date', date).order('date'),
        (supabase.from('calorie_burns') as any).select('id,date,source,activity_type,calories,duration_minutes,distance_km,confidence,energy_model_version,created_at').eq('user_id', user.id).gte('date', from).lte('date', date).order('date'),
        (supabase.from('workouts') as any).select('id,date,day_name,started_at,completed_at,workout_duration_minutes,explicit_pause_seconds,is_skipped,estimated_net_kcal,energy_confidence,exercises(category,completed)').eq('user_id', user.id).gte('date', from).lte('date', date).order('date'),
        (supabase.from('energy_model_states' as any) as any).select('*').eq('user_id', user.id).lte('effective_date', date).order('effective_date', { ascending: false }).limit(1).maybeSingle(),
        (supabase.from('energy_targets' as any) as any).select('*').eq('user_id', user.id).lt('effective_from', date).order('effective_from', { ascending: false }).limit(1).maybeSingle(),
      ]);
      for (const result of [weights, meals, burns, workouts]) if (result.error) throw result.error;
      if (previousState.error && !unavailable(previousState.error)) throw previousState.error;
      if (previousTarget.error && !unavailable(previousTarget.error)) throw previousTarget.error;
      return { weights: weights.data || [], meals: meals.data || [], burns: burns.data || [], workouts: workouts.data || [], previousState: previousState.data || null, previousTarget: previousTarget.data || null };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const result = useMemo(() => {
    if (!query.data || !preferences) return { model: null, breakdown: emptyBreakdown, calibration: null, persistedCalibrationDate: null };
    const weights: WeightObservation[] = query.data.weights.map((row: any) => ({ date: row.date, kg: Number(row.bodyweight) }));
    const activityHistory: ActivityObservation[] = query.data.burns.filter((row: any) => row.source === 'manual').map((row: any) => ({ date: row.date, activityType: row.activity_type, distanceKm: row.distance_km, durationMinutes: row.duration_minutes }));
    const byDay = new Map<string, { meals: any[]; burns: any[]; workouts: any[] }>();
    const bucket = (day: string) => { if (!byDay.has(day)) byDay.set(day, { meals: [], burns: [], workouts: [] }); return byDay.get(day)!; };
    query.data.meals.forEach((row: any) => bucket(row.date).meals.push(row));
    query.data.burns.forEach((row: any) => bucket(row.date).burns.push(row));
    query.data.workouts.forEach((row: any) => bucket(row.date).workouts.push(row));

    const estimateDayActivity = (day: string) => {
      const data = bucket(day);
      const weight = effectiveWeightAt(weights, day, (preferences as any).initial_weight_kg);
      const categories = { workout: 0, walking: 0, running: 0, cycling: 0, boxing: 0, other: 0 };
      const confidences: EnergyConfidence[] = [];

      data.workouts.filter(workout => !workout.is_skipped && workout.completed_at).forEach(workout => {
        const rows = workout.exercises || [];
        const completed = rows.filter((exercise: any) => exercise.completed !== false);
        const compound = completed.filter((exercise: any) => ['primary', 'compound'].includes(String(exercise.category).toLowerCase())).length;
        const isolation = completed.filter((exercise: any) => ['accessory', 'specialization', 'core'].includes(String(exercise.category).toLowerCase())).length;
        const timing = timingFromWorkout(workout);
        const estimate = estimateWorkoutEnergy({ durationMinutes: timing.elapsedMinutes, pausedSeconds: timing.pausedSeconds, completedSets: completed.length, plannedSets: rows.length, compoundSets: compound, isolationSets: isolation, weightKg: weight.kg, hasActualFinish: !!workout.completed_at, intensityOverride: workoutIntensityOverride({ day_name: workout.day_name }) });
        categories.workout += estimate.netKcal;
        confidences.push(estimate.confidence);
      });

      data.burns.filter(burn => burn.source !== 'workout').forEach(burn => {
        const kind = ['walking', 'running', 'cycling', 'boxing'].includes(burn.activity_type) ? burn.activity_type : 'other';
        if (burn.source === 'manual' && Number(burn.duration_minutes) > 0) {
          const estimate = estimateActivity({ kind, date: day, weight, distanceKm: burn.distance_km, durationMinutes: burn.duration_minutes, history: activityHistory });
          categories[kind as keyof typeof categories] += estimate.netKcal;
          confidences.push(estimate.confidence);
        } else {
          categories.other += Math.max(0, Number(burn.calories) || 0);
          confidences.push('low');
        }
      });
      return { categories, total: Object.values(categories).reduce((sum, value) => sum + value, 0), confidences };
    };

    const profileHeight = Number(preferences.height_cm) || 170;
    const lifestyle = (preferences as any).nonexercise_lifestyle || 'mostly_seated';
    const calibrationDays: CalibrationDay[] = [];
    const referenceDay = new Date(`${date}T12:00:00`);
    for (let offset = 41; offset >= 0; offset--) {
      const day = localDateKey(subDays(referenceDay, offset));
      const data = bucket(day);
      const intake = data.meals.reduce((sum, meal) => sum + Math.max(0, Number(meal.calories) || 0), 0);
      const activity = estimateDayActivity(day);
      const dayWeight = effectiveWeightAt(weights, day, (preferences as any).initial_weight_kg);
      const age = ageOnDate((preferences as any).date_of_birth, day, preferences.age);
      const ree = calculateRee(dayWeight.kg, profileHeight, age, preferences.gender);
      calibrationDays.push({ date: day, calories: intake, mealTypes: data.meals.map(meal => meal.meal_type), confirmedMeals: data.meals.filter(meal => meal.is_confirmed).length, totalMeals: data.meals.length, predictedTdee: Math.round(ree * nonexerciseBaselineFactor(lifestyle) + activity.total), weightKg: weights.find(item => item.date === day)?.kg ?? null });
    }

    const previousAdjustment = Number(query.data.previousState?.calibration_adjustment) || 0;
    const previousInputs = query.data.previousState?.inputs || {};
    const lastCalibrationDate = previousInputs.lastCalibrationDate || query.data.previousState?.effective_date || null;
    const daysSinceCalibration = lastCalibrationDate
      ? Math.floor((referenceDay.getTime() - new Date(`${lastCalibrationDate}T12:00:00`).getTime()) / 86_400_000)
      : Number.POSITIVE_INFINITY;
    const holdCalibration = !!query.data.previousState && daysSinceCalibration < 7;
    const calibration = holdCalibration
      ? { ...calibrateEnergyModel([], previousAdjustment), adjustment: previousAdjustment, confidence: (query.data.previousState.calibration_confidence || 'low') as EnergyConfidence, eligible: !!query.data.previousState.calibration_eligible, qualityScore: Number(previousInputs.qualityScore) || 0, reason: `Calibration held steady; next review after ${Math.max(0, 7 - daysSinceCalibration)} days` }
      : calibrateEnergyModel(calibrationDays, previousAdjustment);
    const todayData = bucket(date);
    const todayActivity = estimateDayActivity(date);
    const foodIntake = todayData.meals.reduce((sum, meal) => sum + Math.max(0, Number(meal.calories) || 0), 0);
    const goal = preferences.weight_goal_type;
    const desiredAdjustment = preferences.deficit_mode_enabled ? -Math.abs(Number(preferences.daily_deficit_target) || 500) : goal === 'gain' ? 250 : goal === 'lose' ? -500 : 0;
    const model = buildDailyEnergyModel({
      date,
      weights,
      profileInitialWeightKg: (preferences as any).initial_weight_kg,
      dateOfBirth: (preferences as any).date_of_birth,
      legacyAge: preferences.age,
      heightCm: profileHeight,
      sex: preferences.gender,
      lifestyle,
      calibrationAdjustment: calibration.adjustment,
      workoutActivity: todayActivity.categories.workout,
      otherActivity: todayActivity.total - todayActivity.categories.workout,
      foodIntake,
      goal,
      desiredAdjustment,
      previousCalorieTarget: Number(query.data.previousTarget?.calorie_target) || null,
      lockedCalorieTarget: (preferences as any).calorie_target_locked ? preferences.daily_calorie_goal : null,
      lockedProteinTarget: (preferences as any).protein_target_locked ? preferences.daily_protein_goal : null,
      activityConfidences: [
        ...todayActivity.confidences,
        ...(!preferences.height_cm || !preferences.gender || (!preferences.age && !(preferences as any).date_of_birth) ? ['low' as EnergyConfidence] : []),
      ],
      calibrationConfidence: calibration.confidence,
    });
    const breakdown: EnergyBreakdown = {
      normalDay: model.personalBaseline,
      workout: Math.round(todayActivity.categories.workout),
      walking: Math.round(todayActivity.categories.walking),
      running: Math.round(todayActivity.categories.running),
      cycling: Math.round(todayActivity.categories.cycling),
      boxing: Math.round(todayActivity.categories.boxing),
      other: Math.round(todayActivity.categories.other),
      expenditure: model.calibratedTdee,
      food: foodIntake,
      balance: model.energyBalance,
    };
    return { model, breakdown, calibration, persistedCalibrationDate: holdCalibration ? (lastCalibrationDate || date) : date };
  }, [query.data, preferences, date]);

  const persistenceKey = result.model ? [user?.id, date, result.model.effectiveWeight.kg, result.model.calibratedTdee, result.model.calorieTarget, result.model.proteinTarget, result.calibration?.adjustment].join(':') : '';
  useEffect(() => {
    if (!user || !result.model || date !== localDateKey()) return;
    const model = result.model;
    const calibration = result.calibration;
    void Promise.all([
      (supabase.from('energy_model_states' as any) as any).upsert({ user_id: user.id, effective_date: date, energy_model_version: ENERGY_MODEL_VERSION, effective_weight_kg: model.effectiveWeight.kg, weight_source: model.effectiveWeight.source, formula_ree: model.ree, nonexercise_factor: model.nonexerciseFactor, formula_baseline: model.formulaBaseline, calibration_adjustment: model.calibrationAdjustment, personal_baseline: model.personalBaseline, predicted_tdee: model.predictedTdee, calibrated_tdee: model.calibratedTdee, likely_low: model.likelyRange[0], likely_high: model.likelyRange[1], data_quality: calibration?.qualityScore && calibration.qualityScore >= .8 ? 'high' : calibration?.qualityScore && calibration.qualityScore >= .55 ? 'medium' : 'low', calibration_confidence: calibration?.confidence || 'low', calibration_eligible: calibration?.eligible || false, inputs: { weightObservationCount: model.effectiveWeight.observationCount, qualityScore: calibration?.qualityScore || 0, calibrationReason: calibration?.reason || 'Insufficient history', lastCalibrationDate: result.persistedCalibrationDate || date }, calculated_at: new Date().toISOString() }, { onConflict: 'user_id,effective_date,energy_model_version' }),
      (supabase.from('energy_targets' as any) as any).upsert({ user_id: user.id, effective_from: date, calorie_target: model.calorieTarget, protein_target: model.proteinTarget, estimated_maintenance: model.calibratedTdee, target_adjustment: model.targetAdjustment, basis: model.calibrationAdjustment ? 'personal_calibration' : 'formula_prior', reason: model.targetReason, energy_model_version: ENERGY_MODEL_VERSION, generated_at: new Date().toISOString() }, { onConflict: 'user_id,effective_from,energy_model_version' }),
    ]).catch(error => { if (!unavailable(error)) console.error('[EnergyModelV3] state persistence failed', error); });
  }, [persistenceKey, user, date, result.model, result.calibration, result.persistedCalibrationDate]);

  return { model: result.model, breakdown: result.breakdown, calibration: result.calibration, isLoading: query.isLoading || preferencesLoading, hasProfileInputs: !!preferences?.height_cm && !!preferences?.gender && (!!preferences?.age || !!(preferences as any)?.date_of_birth) };
}
