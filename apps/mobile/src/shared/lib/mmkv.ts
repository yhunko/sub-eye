import { createMMKV } from "react-native-mmkv";

// One device-storage instance backs the Query persister (and any future local
// store) — different keys, same store. MMKV v4 (Nitro) exports the instance
// factory `createMMKV`; `new MMKV()` THROWS on v4.
const mmkv = createMMKV();

// Storage adapter for the Query persister. MMKV is synchronous; the async
// persister accepts sync returns (MaybePromise), so no promise wrapping needed.
export const mmkvStorage = {
  setItem: (key: string, value: string) => mmkv.set(key, value),
  getItem: (key: string) => mmkv.getString(key) ?? null,
  // Block body discards mmkv.remove's boolean — the async persister types
  // removeItem as MaybePromise<void>, which rejects a boolean return.
  removeItem: (key: string) => {
    mmkv.remove(key);
  },
};

/**
 * Device-local on/off switches, on the same store under their own keys.
 *
 * Small typed door rather than exporting `mmkv` itself: the instance stays
 * module-private so the persister and these flags cannot start reading each
 * other's keys. Values are PER-DEVICE and per-install — never per-account.
 */
export const deviceFlags = {
  get: (key: string) => mmkv.getBoolean(key) ?? false,
  set: (key: string, value: boolean) => mmkv.set(key, value),
};
