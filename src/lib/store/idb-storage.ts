import { get, set, del } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

/** zustand persistミドルウェア用のIndexedDBストレージアダプタ(idb-keyval経由)。 */
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    const value = await get(name);
    return value ?? null;
  },
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};
