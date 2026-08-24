import type {
  CategoryRecord,
  PreferencesRecord,
  PricePhaseRecord,
  SubscriptionRecord,
} from "@subeye/store";
import { createMMKV } from "react-native-mmkv";

// Its own instance id, so the store cannot collide with the Query persister and
// the device flags on the default instance (see ../mmkv.ts). MMKV v4 is Nitro:
// `new MMKV()` THROWS, the factory is `createMMKV`.
const mmkv = createMMKV({ id: "subeye.store" });

// Two slots and a pointer, not one key. The whole document is rewritten on every
// mutation and MMKV gives no atomicity across that — a kill mid-write would
// otherwise lose the document rather than the last write. Write the idle slot,
// then move the pointer; the pointer move is a single small write, and until it
// lands the previous document is still the live one.
//
// ponytail: whole-document rewrite is the cheapest thing that bounds the
// failure, and it is a ceiling — every write costs the size of the store. If it
// ever outgrows that, the port boundary in ./ports is where SQLite goes, and
// nothing above it changes.
const SLOTS = ["subeye.doc.a", "subeye.doc.b"] as const;
const POINTER = "subeye.doc.active";

export const DEFAULT_PREFERENCES: PreferencesRecord = {
  preferredCurrency: "uah",
  preferredTimezone: "UTC",
  dateFormat: "DD/MM/YYYY",
  locale: "en",
  theme: "system",
};

export type StoreDoc = {
  v: 1;
  preferences: PreferencesRecord;
  categories: CategoryRecord[];
  subscriptions: SubscriptionRecord[];
  phases: PricePhaseRecord[];
};

const defaults = (): StoreDoc => ({
  v: 1,
  preferences: { ...DEFAULT_PREFERENCES },
  categories: [],
  subscriptions: [],
  phases: [],
});

/** `[the slot readDoc consults first, the slot the next write lands in]`. */
const slots = (): readonly [string, string] =>
  mmkv.getString(POINTER) === SLOTS[1]
    ? [SLOTS[1], SLOTS[0]]
    : [SLOTS[0], SLOTS[1]];

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

/**
 * Never throws. This runs at module load, before any error boundary exists, so
 * a blob from an older build — or a truncated one — has to degrade to a missing
 * field rather than a crash loop.
 */
const parseSlot = (key: string): StoreDoc | null => {
  const raw = mmkv.getString(key);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const doc = parsed as Partial<StoreDoc>;
    const preferences =
      typeof doc.preferences === "object" && doc.preferences !== null
        ? doc.preferences
        : {};

    return {
      v: 1,
      preferences: { ...DEFAULT_PREFERENCES, ...preferences },
      categories: asArray(doc.categories),
      subscriptions: asArray(doc.subscriptions),
      phases: asArray(doc.phases),
    };
  } catch {
    return null;
  }
};

export const readDoc = (): StoreDoc => {
  const [active, idle] = slots();
  return parseSlot(active) ?? parseSlot(idle) ?? defaults();
};

export const writeDoc = (next: StoreDoc): void => {
  const [, idle] = slots();
  mmkv.set(idle, JSON.stringify(next));
  mmkv.set(POINTER, idle);
};

export const eraseDoc = (): void => {
  mmkv.remove(SLOTS[0]);
  mmkv.remove(SLOTS[1]);
  mmkv.remove(POINTER);
};

/**
 * Raw slot access, for staging a torn document in a test.
 *
 * "idle" is where a write lands before the pointer moves — writing garbage
 * there is an interrupted write; "active" is the live copy going unreadable.
 * The two fail differently and the swap only holds if both are covered.
 */
export const __testing = {
  writeSlotRaw: (slot: "active" | "idle", raw: string): void => {
    const [active, idle] = slots();
    mmkv.set(slot === "active" ? active : idle, raw);
  },
  activeSlot: (): string => slots()[0],
};
