import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

// Types for HealthKit data
interface HealthKitSample {
  value: number;
  startDate: string;
  endDate: string;
  unit: string;
}

interface HealthKitPlugin {
  requestAuthorization(options: { all: string[] }): Promise<void>;
  queryHKitSampleType(options: { sampleName: string; startDate: string; endDate: string; limit: number }): Promise<{ resultData: HealthKitSample[] }>;
  isAvailable(): Promise<{ available: boolean }>;
}

// Dynamic import for native-only plugin
let HealthKit: HealthKitPlugin | null = null;

const loadHealthKit = async () => {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    try {
      const module = await import('@perfood/capacitor-healthkit');
      HealthKit = module.CapacitorHealthkit as unknown as HealthKitPlugin;
      return true;
    } catch (e) {
      console.warn('HealthKit not available:', e);
      return false;
    }
  }
  return false;
};

export interface AppleHealthData {
  heartRate: number | null;
  restingHeartRate: number | null;
  oxygenSaturation: number | null;
  steps: number | null;
  activeCalories: number | null;
  sleepHours: number | null;
  lastSynced: Date | null;
}

export function useAppleHealth() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AppleHealthData>({
    heartRate: null,
    restingHeartRate: null,
    oxygenSaturation: null,
    steps: null,
    activeCalories: null,
    sleepHours: null,
    lastSynced: null,
  });

  const checkAvailability = useCallback(async () => {
    const loaded = await loadHealthKit();
    if (!loaded || !HealthKit) {
      setIsAvailable(false);
      return false;
    }

    try {
      const { available } = await HealthKit.isAvailable();
      setIsAvailable(available);
      return available;
    } catch {
      setIsAvailable(false);
      return false;
    }
  }, []);

  const requestAuthorization = useCallback(async () => {
    if (!HealthKit) {
      await loadHealthKit();
    }
    if (!HealthKit) return false;

    try {
      await HealthKit.requestAuthorization({
        all: [
          'HKQuantityTypeIdentifierHeartRate',
          'HKQuantityTypeIdentifierRestingHeartRate',
          'HKQuantityTypeIdentifierOxygenSaturation',
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierActiveEnergyBurned',
          'HKCategoryTypeIdentifierSleepAnalysis',
        ],
      });
      setIsAuthorized(true);
      return true;
    } catch (e) {
      console.error('HealthKit authorization failed:', e);
      return false;
    }
  }, []);

  const fetchHealthData = useCallback(async () => {
    if (!HealthKit) {
      await loadHealthKit();
    }
    if (!HealthKit) return null;

    setIsLoading(true);

    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(startOfDay);
      yesterday.setDate(yesterday.getDate() - 1);

      // Fetch all data types in parallel
      const [heartRateRes, restingHRRes, oxygenRes, stepsRes, caloriesRes] = await Promise.all([
        HealthKit.queryHKitSampleType({
          sampleName: 'heartRate',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          limit: 10,
        }).catch(() => ({ resultData: [] })),
        HealthKit.queryHKitSampleType({
          sampleName: 'restingHeartRate',
          startDate: yesterday.toISOString(),
          endDate: now.toISOString(),
          limit: 1,
        }).catch(() => ({ resultData: [] })),
        HealthKit.queryHKitSampleType({
          sampleName: 'oxygenSaturation',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          limit: 5,
        }).catch(() => ({ resultData: [] })),
        HealthKit.queryHKitSampleType({
          sampleName: 'stepCount',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          limit: 100,
        }).catch(() => ({ resultData: [] })),
        HealthKit.queryHKitSampleType({
          sampleName: 'activeEnergyBurned',
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          limit: 100,
        }).catch(() => ({ resultData: [] })),
      ]);

      // Process heart rate (most recent)
      const heartRate = heartRateRes.resultData.length > 0
        ? Math.round(heartRateRes.resultData[0].value)
        : null;

      // Process resting heart rate
      const restingHeartRate = restingHRRes.resultData.length > 0
        ? Math.round(restingHRRes.resultData[0].value)
        : null;

      // Process oxygen saturation (most recent, convert to percentage)
      const oxygenSaturation = oxygenRes.resultData.length > 0
        ? Math.round(oxygenRes.resultData[0].value * 100)
        : null;

      // Sum steps for the day
      let stepsTotal = 0;
      for (const sample of stepsRes.resultData) {
        stepsTotal += sample.value;
      }
      const steps = stepsTotal;

      // Sum active calories
      let caloriesTotal = 0;
      for (const sample of caloriesRes.resultData) {
        caloriesTotal += sample.value;
      }
      const activeCalories = Math.round(caloriesTotal);

      const healthData: AppleHealthData = {
        heartRate,
        restingHeartRate,
        oxygenSaturation,
        steps: steps > 0 ? steps : null,
        activeCalories: activeCalories > 0 ? activeCalories : null,
        sleepHours: null, // Sleep analysis requires different handling
        lastSynced: new Date(),
      };

      setData(healthData);
      return healthData;
    } catch (e) {
      console.error('Failed to fetch health data:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncToCheckin = useCallback(async (upsertCheckin: (data: any) => Promise<any>) => {
    const healthData = await fetchHealthData();
    if (!healthData) return false;

    try {
      await upsertCheckin({
        heart_rate: healthData.restingHeartRate || healthData.heartRate,
        oxygen_level: healthData.oxygenSaturation,
      });
      return true;
    } catch (e) {
      console.error('Failed to sync to check-in:', e);
      return false;
    }
  }, [fetchHealthData]);

  return {
    isAvailable,
    isAuthorized,
    isLoading,
    data,
    checkAvailability,
    requestAuthorization,
    fetchHealthData,
    syncToCheckin,
  };
}
