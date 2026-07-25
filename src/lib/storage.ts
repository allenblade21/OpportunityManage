/**
 * 应用存储适配器(zustand persist 的 StateStorage 实现)。
 * 优先 IndexedDB(容量大、不阻塞主线程);首次读取时自动迁移旧版
 * localStorage 数据;IndexedDB 不可用或出错时降级 localStorage,
 * localStorage 亦不可用(如隐私模式)时降级为内存(仅当次会话)。
 */
import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'jihui-db';
const STORE_NAME = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // 打开失败时允许下次重试
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function idbOp<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const req = fn(tx.objectStore(STORE_NAME));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

const hasIDB = () => typeof indexedDB !== 'undefined';

/* localStorage 兜底(隐私模式下可能抛异常,一律 try/catch) */
const memory = new Map<string, string>();

function lsGet(name: string): string | null {
  try {
    return localStorage.getItem(name);
  } catch {
    return memory.get(name) ?? null;
  }
}
function lsSet(name: string, value: string): void {
  try {
    localStorage.setItem(name, value);
  } catch {
    memory.set(name, value);
  }
}
function lsRemove(name: string): void {
  try {
    localStorage.removeItem(name);
  } catch {
    memory.delete(name);
  }
}

export const appStorage: StateStorage = {
  getItem: async (name) => {
    if (hasIDB()) {
      try {
        const value = await idbOp<string | undefined>('readonly', (s) => s.get(name));
        if (value !== undefined && value !== null) return value;
        // 迁移:IndexedDB 为空但旧版 localStorage 有数据 → 复制进 IndexedDB
        const legacy = lsGet(name);
        if (legacy !== null) {
          await idbOp('readwrite', (s) => s.put(legacy, name));
          return legacy;
        }
        return null;
      } catch {
        /* 降级到 localStorage */
      }
    }
    return lsGet(name);
  },

  setItem: async (name, value) => {
    if (hasIDB()) {
      try {
        await idbOp('readwrite', (s) => s.put(value, name));
        return;
      } catch {
        /* 降级 */
      }
    }
    lsSet(name, value);
  },

  removeItem: async (name) => {
    if (hasIDB()) {
      try {
        await idbOp('readwrite', (s) => s.delete(name));
        return;
      } catch {
        /* 降级 */
      }
    }
    lsRemove(name);
  },
};
