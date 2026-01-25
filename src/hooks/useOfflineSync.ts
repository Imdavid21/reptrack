import { useState, useEffect, useCallback } from 'react';

interface SyncItem {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'health_os_sync_queue';
const MAX_RETRIES = 5;

/**
 * Offline-first sync queue for gym environments with spotty WiFi
 * - Queues writes when offline
 * - Syncs when connection restored
 * - Handles conflict resolution with last-write-wins
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    if (stored) {
      try {
        setSyncQueue(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse sync queue:', e);
        localStorage.removeItem(SYNC_QUEUE_KEY);
      }
    }
  }, []);

  // Save queue to localStorage on change
  useEffect(() => {
    if (syncQueue.length > 0) {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
    } else {
      localStorage.removeItem(SYNC_QUEUE_KEY);
    }
  }, [syncQueue]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add item to sync queue
  const queueOperation = useCallback((
    table: string,
    action: 'insert' | 'update' | 'delete',
    data: any
  ) => {
    const item: SyncItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      table,
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setSyncQueue(prev => [...prev, item]);
    return item.id;
  }, []);

  // Remove item from queue
  const removeFromQueue = useCallback((id: string) => {
    setSyncQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  // Increment retry count
  const incrementRetry = useCallback((id: string) => {
    setSyncQueue(prev => prev.map(item => 
      item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item
    ));
  }, []);

  // Process sync queue
  const processQueue = useCallback(async (
    syncFn: (item: SyncItem) => Promise<boolean>
  ) => {
    if (!isOnline || isSyncing || syncQueue.length === 0) return;

    setIsSyncing(true);
    const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

    // Sort by timestamp to maintain order
    const sortedQueue = [...syncQueue].sort((a, b) => a.timestamp - b.timestamp);

    for (const item of sortedQueue) {
      if (item.retryCount >= MAX_RETRIES) {
        // Give up on this item after max retries
        console.warn(`Dropping sync item after ${MAX_RETRIES} retries:`, item);
        removeFromQueue(item.id);
        results.failed.push(item.id);
        continue;
      }

      try {
        const success = await syncFn(item);
        if (success) {
          removeFromQueue(item.id);
          results.success.push(item.id);
        } else {
          incrementRetry(item.id);
          results.failed.push(item.id);
        }
      } catch (error) {
        console.error('Sync error:', error);
        incrementRetry(item.id);
        results.failed.push(item.id);
      }
    }

    setIsSyncing(false);
    return results;
  }, [isOnline, isSyncing, syncQueue, removeFromQueue, incrementRetry]);

  // Clear entire queue (use with caution)
  const clearQueue = useCallback(() => {
    setSyncQueue([]);
    localStorage.removeItem(SYNC_QUEUE_KEY);
  }, []);

  return {
    isOnline,
    isSyncing,
    queueLength: syncQueue.length,
    syncQueue,
    queueOperation,
    processQueue,
    clearQueue,
    removeFromQueue,
  };
}

/**
 * Hook to detect when a new SW version is available
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdate = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        setUpdateAvailable(true);
        setWaitingWorker(registration.waiting);
      }
    };

    checkForUpdate();

    // Listen for new service workers
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);

  const applyUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [waitingWorker]);

  return { updateAvailable, applyUpdate };
}
