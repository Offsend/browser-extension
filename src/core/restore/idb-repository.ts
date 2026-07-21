import type { MappingRepository, VaultRecord } from './types';

const DB_NAME = 'offsend';
const STORE = 'mappings';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = fn(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

/** Run multiple requests inside a single transaction. */
function txBatch(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    fn(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/** IndexedDB-backed repository used by the service worker. Survives tab reloads. */
export function createIdbRepository(): MappingRepository {
  return {
    async put(record: VaultRecord) {
      const db = await openDb();
      await tx(db, 'readwrite', (s) => s.put(record));
      db.close();
    },
    async getAll() {
      const db = await openDb();
      const all = await tx<VaultRecord[]>(db, 'readonly', (s) => s.getAll());
      db.close();
      return all;
    },
    async delete(ids: readonly string[]) {
      if (ids.length === 0) return;
      const db = await openDb();
      await txBatch(db, 'readwrite', (s) => {
        for (const id of ids) s.delete(id);
      });
      db.close();
    },
    async deleteExpired(now: number) {
      const db = await openDb();
      const all = await tx<VaultRecord[]>(db, 'readonly', (s) => s.getAll());
      const expired = all.filter((r) => r.expiresAt <= now).map((r) => r.id);
      if (expired.length > 0) {
        await txBatch(db, 'readwrite', (s) => {
          for (const id of expired) s.delete(id);
        });
      }
      db.close();
    },
    async clear() {
      const db = await openDb();
      await tx(db, 'readwrite', (s) => s.clear());
      db.close();
    },
  };
}
