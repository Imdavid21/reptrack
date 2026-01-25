import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9d7c1917e7644257aaefb1c47bb26f77',
  appName: 'reps-and-reminders',
  webDir: 'dist',
  server: {
    url: 'https://9d7c1917-e764-4257-aaef-b1c47bb26f77.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    CapacitorHealthkit: {
      // Request all health data types we need
      readTypes: [
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierOxygenSaturation',
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierRestingHeartRate',
        'HKCategoryTypeIdentifierSleepAnalysis'
      ],
      writeTypes: []
    }
  }
};

export default config;
