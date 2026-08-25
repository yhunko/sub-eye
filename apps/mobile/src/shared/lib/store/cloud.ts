import { requireOptionalNativeModule } from "expo-modules-core";
import { deviceFlags } from "@/shared/lib/mmkv";
import { reportError } from "@/shared/lib/sentry";
import {
  applyEntries,
  CLOUD_KEY_BUDGET,
  diffEntries,
  docToEntries,
  isCloudKey,
  snapshotAsChanges,
} from "./cloud-keys";
import { readDoc, writeDoc } from "./document";

/**
 * iCloud key-value sync for the store document — the ONE thing in this app that
 * leaves the device on purpose.
 *
 * Off by default and never implied: it is a switch in Settings → Data, because
 * "everything stays on this phone" is a promise the app makes on its landing
 * page, and quietly uploading a spending history would break it. Free, not Pro:
 * insurance behind a paywall reads as a threat in a way a capability does not,
 * and the marginal cost per user is zero.
 *
 * Not a replacement for device backup. MMKV already lives in `Documents`, so a
 * restored iPhone gets its subscriptions back with this switch off. What this
 * buys is a SECOND device seeing the same list.
 */

type IcloudKvModule = {
  isAvailable(): boolean;
  snapshot(): Record<string, string>;
  apply(sets: Record<string, string>, removals: string[]): boolean;
  addListener(
    event: "onChange",
    listener: (change: { reason: number; keys: string[] }) => void,
  ): { remove(): void };
};

// Optional, not required: this module is Apple-only, so it is absent on Android
// and under `bun test`. Every caller already handles "iCloud is unavailable" —
// a missing native side is one more way to be unavailable, and making it an
// import-time throw would take the whole store down with it.
const native = requireOptionalNativeModule<IcloudKvModule>("IcloudKv");

/** Mirrors `NSUbiquitousKeyValueStoreChangeReason`. */
const ACCOUNT_CHANGE = 3;
const QUOTA_VIOLATION = 2;

const ENABLED_KEY = "cloud.sync";

/**
 * Whether this device COULD sync: the native module is here and the key-value
 * store is usable.
 *
 * It does NOT prove an iCloud account is signed in — see the long note on
 * `isAvailable` in `IcloudKvModule.swift` for why the check that did was wrong
 * for this app and left the toggle permanently grey. An account that goes away
 * is handled where it actually happens instead: `observeCloud` switches sync off
 * on `ACCOUNT_CHANGE`.
 */
export function cloudSyncAvailable(): boolean {
  try {
    return native?.isAvailable() ?? false;
  } catch {
    return false;
  }
}

export const cloudSyncEnabled = (): boolean => deviceFlags.get(ENABLED_KEY);

/** Push whatever the cloud is missing, and drop whatever it should not hold. */
function reconcileUp(): void {
  if (!native) return;

  const entries = docToEntries(readDoc());
  const count = Object.keys(entries).length;
  if (count > CLOUD_KEY_BUDGET) {
    // iOS drops the write that overflows the store rather than failing it, so
    // past this point sync would go silently partial. Stop instead: the local
    // document is untouched and still complete.
    reportError(new Error(`cloud key budget exceeded: ${count}`), {
      scope: "cloud.reconcile",
    });
    return;
  }

  const { set, remove } = diffEntries(entries, native.snapshot());
  if (!Object.keys(set).length && !remove.length) return;

  native.apply(set, remove);
}

/**
 * Called after every local write. Never throws into the write path — a failed
 * upload must not turn a saved subscription into an error.
 */
export function pushToCloud(): void {
  if (!cloudSyncEnabled()) return;
  try {
    reconcileUp();
  } catch (error) {
    reportError(error, { scope: "cloud.push" });
  }
}

/**
 * Turn sync on or off for this device.
 *
 * Switching ON is a MERGE, not a download: everything the cloud holds is folded
 * in, then everything this device holds is pushed up. Neither side wins, because
 * either rule loses somebody's data — a fresh install would otherwise wipe the
 * cloud, and a device that has been offline for a week would lose its week.
 *
 * Switching OFF leaves the cloud exactly as it is. The records there belong to
 * the other devices too, and this one going local is not a decision about them.
 */
export function setCloudSyncEnabled(next: boolean): void {
  deviceFlags.set(ENABLED_KEY, next);
  if (!next || !native) return;

  try {
    writeDoc(applyEntries(readDoc(), snapshotAsChanges(native.snapshot())));
    reconcileUp();
  } catch (error) {
    reportError(error, { scope: "cloud.link" });
  }
}

/**
 * Drop everything this app owns from the cloud.
 *
 * Erase has to reach here or it does not mean anything: leave the keys and the
 * next sync pulls the whole erased document straight back onto the device, and
 * every other signed-in device keeps its copy regardless.
 */
export function clearCloud(): void {
  if (!native || !cloudSyncEnabled()) return;
  try {
    native.apply({}, Object.keys(native.snapshot()).filter(isCloudKey));
  } catch (error) {
    reportError(error, { scope: "cloud.clear" });
  }
}

/**
 * Fold changes made on another device into this one. Returns an unsubscribe.
 *
 * `onApplied` fires only when the document actually moved, because it is what
 * repaints every screen — running it on every notification would invalidate the
 * whole app each time this device's own write echoed back.
 */
export function observeCloud(onApplied: () => void): () => void {
  if (!native) return () => {};

  const subscription = native.addListener("onChange", ({ reason, keys }) => {
    try {
      if (reason === ACCOUNT_CHANGE) {
        // A DIFFERENT Apple Account is signed in, so everything in the store now
        // belongs to someone else. Switch off rather than merge two people's
        // subscriptions together; the user can turn it back on deliberately.
        deviceFlags.set(ENABLED_KEY, false);
        return;
      }

      if (reason === QUOTA_VIOLATION) {
        reportError(new Error("icloud kv quota exceeded"), {
          scope: "cloud.observe",
        });
        return;
      }

      if (!cloudSyncEnabled()) return;

      const ours = keys.filter(isCloudKey);
      if (!ours.length) return;

      // The notification names the keys but never their values, so the current
      // snapshot is what says whether each one was written or removed.
      const snapshot = native.snapshot();
      const changed = Object.fromEntries(
        ours.map((key) => [key, snapshot[key] ?? null]),
      );

      const before = readDoc();
      const after = applyEntries(before, changed);
      if (JSON.stringify(after) === JSON.stringify(before)) return;

      writeDoc(after);
      onApplied();
    } catch (error) {
      reportError(error, { scope: "cloud.observe" });
    }
  });

  return () => subscription.remove();
}
