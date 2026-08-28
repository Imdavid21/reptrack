/**
 * Offline Sync Queue
 * Stores failed Supabase mutations in IndexedDB and replays them when connectivity returns.
 */

const DB_NAME = 'reptrack_offline';
const STORE_NAME = 'sync_queue';
const DB_VERSION = 2;

export interface SyncQueueItem {
  id: string;
  timestamp: number;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  /** Account that created this queued write. Optional only for legacy v1 rows. */
  ownerUserId?: string;
  /** For multi-step flows (workout + exercises + habits), group items together */
  groupId?: string;
  /** Order within group */
  groupOrder?: number;
  /** Number of retry attempts */
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('groupId', 'groupId', { unique: false });
      } else {
        store = request.transaction!.objectStore(STORE_NAME);
      }
      if (!store.indexNames.contains('ownerUserId')) store.createIndex('ownerUserId', 'ownerUserId', { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOperation(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>): Promise<string> {
  const db = await openDB();
  const id = crypto.randomUUID();
  const entry: SyncQueueItem = { ...item, id, timestamp: Date.now(), retries: 0 };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(entry);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedItems(): Promise<SyncQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).index('timestamp').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateItemRetries(id: string, retries: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.retries = retries;
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueCount(userId?: string): Promise<number> {
  const db = await openDB();
  if (!userId) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // New rows are indexed by owner. Legacy v1 rows have no owner field, so add
  // only legacy rows whose payload explicitly identifies this account. Unknown
  // legacy child rows remain replay-protected but are not shown to another user.
  const items = await getQueuedItems();
  return items.filter(item => {
    if (item.ownerUserId) return item.ownerUserId === userId;
    const payloadOwner = item.payload.user_id;
    return typeof payloadOwner === 'string' && payloadOwner === userId;
  }).length;
}
