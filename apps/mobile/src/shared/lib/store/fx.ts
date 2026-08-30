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
// The last ATTEMPT, successful or not. Its own key rather than a field in the
// blob: a failed attempt has no document to write beside it, and recording one
// must not re-serialise 7 KB of rates.
const CHECKED_KEY = "subeye.fx.checkedAt";

/**
 * How long a refresh that did NOT land today's build stands as the answer.
 *
 * Without it every foreground re-walks all three candidates whenever the cache
 * is not today's — which is the whole of a day the publisher's build lags, and
 * the whole of any stretch spent offline. An hour is short enough that a build
 * landing at noon is picked up the same afternoon.
 */
const RETRY_AFTER_MS = 60 * 60 * 1000;

/** RN's fetch has no default timeout, and a captive portal never answers. */
const FETCH_TIMEOUT_MS = 8000;

type CachedRates = {
  base: string;
  rates: RateTable;
  rateDate: string;
};

const seedRates: RateTable = readFxDocument(seed as FxDocument)?.rates ?? {};

const readCache = (): CachedRates | null => {
  const raw = mmkv.getString(CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedRates | null;
    // The base is checked, not assumed: a table derived from a different base
    // converts every amount by the wrong factor and never throws.
    return parsed &&
      parsed.base === STORED_BASE &&
      typeof parsed.rates === "object" &&
      parsed.rates !== null
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
 * Which build the cache is holding, or `null` for "the bundled seed".
 *
 * The only way to tell a refresh that CHANGED the table from one that found the
 * cache already current — `refreshRates` reports both as success. Callers that
 * repaint converted money need the difference.
 */
export const cachedRateDate = (): string | null =>
  readCache()?.rateDate ?? null;

/** Aborts rather than hanging: the caller runs on every foreground. */
const fetchWithTimeout = async (url: string): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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

  // Everything past here is a MISS — the day's build is not in hand. That is the
  // common state for hours after midnight UTC and for the whole of a flight, and
  // without a throttle each of those foregrounds spends three requests to learn
  // what the last one already found out.
  const checkedAt = Date.parse(mmkv.getString(CHECKED_KEY) ?? "");
  if (
    Number.isFinite(checkedAt) &&
    now.getTime() - checkedAt < RETRY_AFTER_MS
  ) {
    return false;
  }
  // Stamped before the walk, not after: a throw, an abort or the app being
  // backgrounded mid-request must still count as an attempt.
  mmkv.set(CHECKED_KEY, now.toISOString());

  for (const version of fxVersionCandidates(now)) {
    try {
      const response = await fetchWithTimeout(fxDocumentUrl(version));
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
    mmkv.remove(CHECKED_KEY);
  },
  // A successful fetch is otherwise the only writer, and it can never produce
  // the shapes `readCache` guards against.
  writeCache: (cache: CachedRates): void => {
    mmkv.set(CACHE_KEY, JSON.stringify(cache));
  },
};
