import { useCallback, useEffect, useState } from 'react';

export interface DevicePreferences {
  keepScreenAwake: boolean;
  collapseCompletedExercises: boolean;
}

const STORAGE_KEY = 'reptrack-device-preferences-v1';
const DEFAULTS: DevicePreferences = {
  keepScreenAwake: true,
  collapseCompletedExercises: true,
};

function readPreferences(): DevicePreferences {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<DevicePreferences>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function useDevicePreferences() {
  const [preferences, setPreferences] = useState<DevicePreferences>(readPreferences);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setPreferences(readPreferences());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateDevicePreference = useCallback(<K extends keyof DevicePreferences>(key: K, value: DevicePreferences[K]) => {
    setPreferences(current => {
      const next = { ...current, [key]: value };
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* presentation preference only */ }
      return next;
    });
  }, []);

  return { preferences, updateDevicePreference };
}

export function readDevicePreference<K extends keyof DevicePreferences>(key: K): DevicePreferences[K] {
  return readPreferences()[key];
}
