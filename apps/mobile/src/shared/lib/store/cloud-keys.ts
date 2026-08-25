import type {
  CategoryRecord,
  PreferencesRecord,
  PricePhaseRecord,
  SubscriptionRecord,
} from "@subeye/store";
import { DEFAULT_PREFERENCES, type StoreDoc } from "./document";

/**
 * The store document flattened to ONE KEY PER RECORD, and back.
 *
 * This shape is the whole conflict-resolution strategy. `NSUbiquitousKeyValueStore`
 * resolves per key, last writer wins — so a record per key means two devices
 * editing two different subscriptions both keep their edit, and iOS never has to
 * be told how to merge anything. A single document key would have turned every
 * concurrent edit into a whole-store conflict, which is how one device's evening
 * of typing disappears.
 *
 * A deletion is the ABSENCE of a key, which is why the collections here are
 * rebuilt from the cloud's key set rather than diffed record by record. There is
 * no tombstone list and nothing to prune.
 *
 * Pure and tested. Everything that touches the native store is in ./cloud.
 */

/** Prefixes, not a nested shape: the store is one flat namespace. */
const SUBSCRIPTION = "sub.";
const CATEGORY = "cat.";
const PHASE = "phase.";
/** Preferences are a single record with no id, so they get a bare key. */
const PREFERENCES = "prefs";

/**
 * iOS caps the store at 1024 keys and 1 MB, and drops the write that would
 * exceed either. Records are ~300 bytes, so keys are the binding limit and this
 * is the number of subscriptions + categories + phases the app can sync.
 *
 * ponytail: a flat ceiling with a check at the call site, not a chunking scheme.
 * Production holds ~70 keys. If this is ever approached, the answer is CloudKit,
 * not splitting records across keys.
 */
export const CLOUD_KEY_BUDGET = 1000;

export const isCloudKey = (key: string): boolean =>
  key === PREFERENCES ||
  key.startsWith(SUBSCRIPTION) ||
  key.startsWith(CATEGORY) ||
  key.startsWith(PHASE);

/** The document, as the cloud should hold it. */
export function docToEntries(doc: StoreDoc): Record<string, string> {
  const entries: Record<string, string> = {
    [PREFERENCES]: JSON.stringify(doc.preferences),
  };
  for (const row of doc.subscriptions) {
    entries[SUBSCRIPTION + row.id] = JSON.stringify(row);
  }
  for (const row of doc.categories) {
    entries[CATEGORY + row.id] = JSON.stringify(row);
  }
  for (const row of doc.phases) {
    entries[PHASE + row.id] = JSON.stringify(row);
  }
  return entries;
}

/**
 * What to write and what to delete so the cloud matches `wanted`.
 *
 * Compares the SERIALISED values, so a record that was read and written back
 * unchanged produces no write at all — which is what stops the app from spending
 * iCloud's write budget on every foreground.
 *
 * `remove` only ever names keys this app owns. Anything else in the store is
 * left alone: the KV store belongs to the whole app, and a future feature
 * keeping a key here must not be erased by a subscription write.
 */
export function diffEntries(
  wanted: Record<string, string>,
  present: Record<string, string>,
): { set: Record<string, string>; remove: string[] } {
  const set: Record<string, string> = {};
  for (const [key, value] of Object.entries(wanted)) {
    if (present[key] !== value) set[key] = value;
  }

  const remove = Object.keys(present).filter(
    (key) => isCloudKey(key) && !(key in wanted),
  );

  return { set, remove };
}

/**
 * Never throws, and never lets a bad record through.
 *
 * A value here came off another device, possibly running another build. The
 * cost of trusting one is a row with no id that every screen then renders as
 * blank — so a record that cannot be parsed, or whose id does not match the key
 * that carried it, is dropped as if the key were absent.
 */
function parseRecord<T extends { id: string }>(
  key: string,
  prefix: string,
  raw: string,
): T | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as T;
    return record.id === key.slice(prefix.length) ? record : null;
  } catch {
    return null;
  }
}

function parsePreferences(raw: string): PreferencesRecord | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    // Merged over the defaults rather than taken whole: a build that adds a
    // preference must not read back `undefined` for it from an older device.
    return {
      ...DEFAULT_PREFERENCES,
      ...(parsed as Partial<PreferencesRecord>),
    };
  } catch {
    return null;
  }
}

const upsert = <T extends { id: string }>(rows: T[], next: T): T[] => {
  const index = rows.findIndex((row) => row.id === next.id);
  if (index === -1) return [...rows, next];
  const copy = [...rows];
  copy[index] = next;
  return copy;
};

const without = <T extends { id: string }>(rows: T[], id: string): T[] =>
  rows.filter((row) => row.id !== id);

/**
 * Fold a set of changed cloud keys into a document. `null` means the key is
 * gone, which is a deletion.
 *
 * Applies ONLY the keys named. Rebuilding the document from a full snapshot
 * would be shorter and is wrong: it would delete every record this device holds
 * that has not been pushed yet — the entire contents of a device that was
 * offline, or that had sync switched off.
 *
 * Deleting a subscription does NOT cascade to its phases here, even though the
 * local port does. The other device deleted both and removed both keys, so the
 * phase deletions arrive as their own changed keys; cascading again would delete
 * phases belonging to a subscription this device has not received yet.
 */
export function applyEntries(
  doc: StoreDoc,
  changed: Record<string, string | null>,
): StoreDoc {
  let next = doc;

  for (const [key, raw] of Object.entries(changed)) {
    if (key === PREFERENCES) {
      // Preferences have no id and no timestamp, so they are the one thing here
      // that is whole-record last-writer-wins. There are five of them and they
      // are all device-ish; losing one to a race costs a re-tap, not data.
      const preferences = raw === null ? null : parsePreferences(raw);
      if (preferences) next = { ...next, preferences };
      continue;
    }

    if (key.startsWith(SUBSCRIPTION)) {
      const id = key.slice(SUBSCRIPTION.length);
      const record =
        raw === null
          ? null
          : parseRecord<SubscriptionRecord>(key, SUBSCRIPTION, raw);
      next = {
        ...next,
        subscriptions:
          raw === null
            ? without(next.subscriptions, id)
            : record
              ? upsert(next.subscriptions, record)
              : next.subscriptions,
      };
      continue;
    }

    if (key.startsWith(CATEGORY)) {
      const id = key.slice(CATEGORY.length);
      const record =
        raw === null ? null : parseRecord<CategoryRecord>(key, CATEGORY, raw);
      next = {
        ...next,
        categories:
          raw === null
            ? without(next.categories, id)
            : record
              ? upsert(next.categories, record)
              : next.categories,
      };
      continue;
    }

    if (key.startsWith(PHASE)) {
      const id = key.slice(PHASE.length);
      const record =
        raw === null ? null : parseRecord<PricePhaseRecord>(key, PHASE, raw);
      next = {
        ...next,
        phases:
          raw === null
            ? without(next.phases, id)
            : record
              ? upsert(next.phases, record)
              : next.phases,
      };
    }
  }

  return next;
}

/**
 * A whole snapshot expressed as changed keys, for the first link of a device.
 *
 * Union, not replacement: this only ever ADDS what the cloud holds. Records this
 * device has and the cloud does not are pushed up by the same reconcile that
 * follows, so switching sync on merges two devices rather than letting either
 * one win.
 */
export const snapshotAsChanges = (
  snapshot: Record<string, string>,
): Record<string, string | null> =>
  Object.fromEntries(
    Object.entries(snapshot).filter(([key]) => isCloudKey(key)),
  );
