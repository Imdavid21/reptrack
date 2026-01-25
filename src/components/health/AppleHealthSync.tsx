import { useState, useEffect } from 'react';
import { useAppleHealth } from '@/hooks/useAppleHealth';
import { useMorningCheckin } from '@/hooks/useMorningCheckin';
import { useNightCheckin } from '@/hooks/useNightCheckin';
import { Apple, RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

export function AppleHealthSync() {
  const {
    isAvailable,
    isAuthorized,
    isLoading,
    data,
    checkAvailability,
    requestAuthorization,
    fetchHealthData,
  } = useAppleHealth();
  
  const { upsertCheckin: upsertMorning } = useMorningCheckin();
  const { upsertCheckin: upsertNight } = useNightCheckin();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Not on iOS native
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    return (
      <div className="card-brutalist opacity-60">
        <div className="flex items-center gap-2 mb-4">
          <Apple className="h-4 w-4" />
          <h3 className="section-header mb-0">APPLE HEALTH</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Apple Health sync is available when running as a native iOS app. 
          Export this project to your own repo and build with Xcode.
        </p>
      </div>
    );
  }

  // HealthKit not available on this device
  if (isAvailable === false) {
    return (
      <div className="card-brutalist">
        <div className="flex items-center gap-2 mb-4">
          <Apple className="h-4 w-4" />
          <h3 className="section-header mb-0">APPLE HEALTH</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          HealthKit is not available on this device.
        </div>
      </div>
    );
  }

  const handleConnect = async () => {
    const authorized = await requestAuthorization();
    if (authorized) {
      toast.success('Connected to Apple Health');
      await fetchHealthData();
    } else {
      toast.error('Failed to connect to Apple Health');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const healthData = await fetchHealthData();
      if (!healthData) {
        toast.error('No health data available');
        return;
      }

      // Sync to morning check-in
      if (healthData.heartRate || healthData.restingHeartRate || healthData.oxygenSaturation) {
        await upsertMorning({
          heart_rate: healthData.restingHeartRate || healthData.heartRate,
          oxygen_level: healthData.oxygenSaturation,
        });
      }

      // Sync steps to night check-in
      if (healthData.steps) {
        await upsertNight({
          steps: healthData.steps,
        });
      }

      toast.success('Health data synced');
    } catch (error) {
      toast.error('Failed to sync health data');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="card-brutalist">
        <div className="flex items-center gap-2 mb-4">
          <Apple className="h-4 w-4" />
          <h3 className="section-header mb-0">APPLE HEALTH</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Connect to sync heart rate, steps, and oxygen data automatically.
        </p>
        <button
          onClick={handleConnect}
          className="btn-brutalist w-full flex items-center justify-center gap-2"
        >
          <Apple className="h-4 w-4" />
          CONNECT APPLE HEALTH
        </button>
      </div>
    );
  }

  return (
    <div className="card-brutalist">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Apple className="h-4 w-4" />
          <h3 className="section-header mb-0">APPLE HEALTH</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary">
          <Check className="h-3 w-3" />
          CONNECTED
        </div>
      </div>

      {data.lastSynced && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {data.heartRate && (
            <div>
              <div className="text-2xl font-bold tabular-nums">{data.heartRate}</div>
              <div className="text-xs text-muted-foreground">BPM</div>
            </div>
          )}
          {data.oxygenSaturation && (
            <div>
              <div className="text-2xl font-bold tabular-nums">{data.oxygenSaturation}%</div>
              <div className="text-xs text-muted-foreground">SpO2</div>
            </div>
          )}
          {data.steps && (
            <div>
              <div className="text-2xl font-bold tabular-nums">{data.steps.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">STEPS</div>
            </div>
          )}
          {data.activeCalories && (
            <div>
              <div className="text-2xl font-bold tabular-nums">{data.activeCalories}</div>
              <div className="text-xs text-muted-foreground">ACTIVE CAL</div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleSync}
        disabled={isSyncing || isLoading}
        className="btn-brutalist w-full flex items-center justify-center gap-2"
      >
        {isSyncing || isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        SYNC NOW
      </button>

      {data.lastSynced && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Last synced: {data.lastSynced.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
