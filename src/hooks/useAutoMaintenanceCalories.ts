import { useEnergyModel } from './useEnergyModel';

export interface AutoMaintenance {
  bmr: number;
  maintenance: number;
  predictedTdee: number;
  likelyRange: [number, number];
  confidence: 'low' | 'medium' | 'high';
  effectiveWeightKg: number;
  calibrationAdjustment: number;
  calorieTarget: number;
  proteinTarget: number;
  targetReason: string;
  modelVersion: number;
  isLoading: boolean;
  isAvailable: boolean;
}

/** Compatibility view backed by Personal Energy Engine V3. */
export function useAutoMaintenanceCalories(referenceDate: Date = new Date()): AutoMaintenance {
  const { model, isLoading, hasProfileInputs } = useEnergyModel(referenceDate);
  return {
    bmr: model?.ree ?? 0,
    maintenance: model?.personalBaseline ?? 0,
    predictedTdee: model?.calibratedTdee ?? 0,
    likelyRange: model?.likelyRange ?? [0, 0],
    confidence: model?.confidence ?? 'low',
    effectiveWeightKg: model?.effectiveWeight.kg ?? 0,
    calibrationAdjustment: model?.calibrationAdjustment ?? 0,
    calorieTarget: model?.calorieTarget ?? 0,
    proteinTarget: model?.proteinTarget ?? 0,
    targetReason: model?.targetReason ?? '',
    modelVersion: model?.modelVersion ?? 3,
    isLoading,
    isAvailable: !!model && hasProfileInputs,
  };
}
