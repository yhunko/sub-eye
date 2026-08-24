import {
  deriveRatesFor,
  type FxDocument,
  fxDocumentUrl,
  fxVersionCandidates,
  type RateTable,
  readFxDocument,
  STORED_BASE,
} from "@subeye/money";
import type { RatesPort } from "@subeye/store";
import { createMMKV } from "react-native-mmkv";
import seed from "./fx-seed.json";

// Its own MMKV instance rather than a key in the store document: the table is
// ~7 KB of 340 codes, and a subscription write must not re-serialise it. It is
// also not user data, so erasing the store has no business clearing it.
const mmkv = createMMKV({ id: "subeye.fx" });
const CACHE_KEY = "subeye.fx.usd";

type CachedRates = {
  base: string;
  rates: RateTable;
  rateDate: string;
  fetchedAt: string;
};

const seedRates: RateTable = readFxDocument(seed as FxDocument)?.rates ?? {};

const readCache = (): CachedRates | null => {
  const raw = mmkv.getString(CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedRates | null;
    return parsed && typeof parsed.rates === "object" && parsed.rates !== null
      ? parsed
      : null;
  } catch {
    return null;
  }
};

/** The CDN stamps its build `YYYY-MM-DD` in UTC; this is the same string. */
const utcDay = (now: Date): string => now.toISOString().slice(0, 10);

/**
 * NEVER fetches. The request path must not wait on a CDN — the same rule the
 * server's `getRates` followed, and the reason the daily refresh exists at all.
 * A cold install answers from the bundled seed, so airplane mode still converts.
 */
export const ratesPort: RatesPort = {
  forBase: async (code) =>
    deriveRatesFor(code, readCache()?.rates ?? seedRates),
};

/**
 * Pull the CDN's immutable build for today into the cache, walking back to
 * yesterday and then `latest` because the publisher's build can lag the UTC
 * date.
 *
 * Answers whether the cache is current and never throws: offline is the normal
 * case here, not an error, and the previous cache stays live either way.
 */
export const refreshRates = async (now: Date): Promise<boolean> => {
  // The build is immutable per day, so a second fetch cannot change the answer.
  if (readCache()?.rateDate === utcDay(now)) return true;

  for (const version of fxVersionCandidates(now)) {
    try {
      const response = await fetch(fxDocumentUrl(version));
      if (!response.ok) {
        throw new Error(`Currency CDN responded with ${response.status}`);
      }

      const read = readFxDocument((await response.json()) as FxDocument);
      if (!read) {
        throw new Error(`Document for ${version} has no "${STORED_BASE}" key`);
      }

      mmkv.set(
        CACHE_KEY,
        JSON.stringify({
          base: STORED_BASE,
          rates: read.rates,
          // A document without its own date is stamped with the version tag it
          // came from, so the cache still says which build it is.
          rateDate: read.rateDate || version,
          fetchedAt: now.toISOString(),
        } satisfies CachedRates),
      );
      return true;
    } catch {
      // Next candidate.
    }
  }

  return false;
};

// Block body discards mmkv.remove's boolean, which does not fit a void return.
export const __testing = {
  clearCache: (): void => {
    mmkv.remove(CACHE_KEY);
  },
};
