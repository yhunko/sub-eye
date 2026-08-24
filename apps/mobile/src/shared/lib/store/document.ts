import type {
  CategoryRecord,
  PreferencesRecord,
  PricePhaseRecord,
  SubscriptionRecord,
} from "@subeye/store";
import { getLocales } from "expo-localization";
import { createMMKV } from "react-native-mmkv";
// Straight from ./format/money rather than the format barrel: that barrel pulls
// when.ts, which pulls the i18n runtime and Paraglide into the store layer.
import { supportedCurrencyCode } from "@/shared/lib/format/money";

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

// Both fall back rather than throw: they run on readDoc's path, which must
// survive a device that reports neither.
function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function deviceCurrency(): string {
  try {
    return supportedCurrencyCode(getLocales()[0]?.currencyCode) ?? "uah";
  } catch {
    return "uah";
  }
}

/**
 * The preferences a store that has never been written reads as.
 *
 * The two that change what a number MEANS come from the device, and this cold
 * path is the only place they are ever guessed: the first write persists them
 * and the stored value is authoritative from then on. That is the whole of the
 * device-zone-versus-stored-zone question — there is no second source to
 * disagree with.
 *
 * `locale` and `theme` are not seeded because nothing reads them: the app takes
 * its language from the OS (per-app language, see shared/i18n) and is dark-only.
 *
 * Computed once at module load — readDoc runs on every port read, and neither
 * of these can change without the process restarting.
 */
export const DEFAULT_PREFERENCES: PreferencesRecord = {
  preferredCurrency: deviceCurrency(),
  preferredTimezone: deviceTimezone(),
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
  const raw = JSON.stringify(next);
  mmkv.set(idle, raw);
  // `set` reports nothing, so a write that did not land is silent — and moving
  // the pointer onto that slot makes readDoc fall back to the OTHER one, i.e.
  // the previous document. That reads as rows coming back from the dead rather
  // than as a failed write. Throwing here surfaces it as the failed write it is.
  if (mmkv.getString(idle) !== raw) throw new Error("store write did not land");
  mmkv.set(POINTER, idle);
};

export const eraseDoc = (): void => {
  mmkv.remove(SLOTS[0]);
  mmkv.remove(SLOTS[1]);
  mmkv.remove(POINTER);
  // `remove` only tombstones. MMKV appends to an mmap file and never shrinks it
  // on its own, so without this every version of the document the user ever had
  // stays readable in `Documents/mmkv/subeye.store` — and Documents is inside
  // the device backup set, so it travels into backups too. Measured on a real
  // store: 128 KB of erased subscriptions before, 16 KB after.
  //
  // ponytail: trim TRUNCATES, it does not zero. The one page MMKV keeps can
  // still hold fragments of the last document written into it, so this shrinks
  // the residue rather than guaranteeing none. Zeroing would mean overwriting
  // each slot with filler before removing it; that is worth doing only if
  // "erase" ever has to stand up to someone reading the raw container.
  mmkv.trim();
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
