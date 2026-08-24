import { createMMKV } from "react-native-mmkv";

// The device's flag store. The subscription document lives on its own instance
// (shared/lib/store) — different files, not different keys. MMKV v4 (Nitro)
// exports the instance factory `createMMKV`; `new MMKV()` THROWS on v4.
const mmkv = createMMKV();

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

/**
 * Structured device-local values, JSON on the same store.
 *
 * `get` never throws: a blob written by an older build — or a truncated one —
 * falls back to the caller's default. A settings object is read at render and
 * before every schedule, so a parse error here would be a crash loop rather
 * than a bad preference.
 */
export const deviceJson = {
  get: <T>(key: string, fallback: T): T => {
    const raw = mmkv.getString(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set: (key: string, value: unknown) => mmkv.set(key, JSON.stringify(value)),
};
