import { CurrencyUtils } from "@subeye/shared";
import { FxRateRepository } from "./fxRateRepository";

/**
 * The base currency we actually store. Every other base is derived from this
 * one document, so the daily refresh is a single fetch and a single row.
 */
const STORED_BASE = "usd";

/**
 * The CDN is version-pinned to an immutable, date-tagged build rather than
 * `@latest`. `@latest` was previously fetched on the critical path of
 * GET /subscriptions and every analytics endpoint, with a module-level cache
 * that ephemeral Worker isolates mostly missed.
 */
const cdnUrl = (version: string): string =>
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/${STORED_BASE}.json`;

/** The immutable tag published for a given UTC day, e.g. 2026.7.20. */
const dateTag = (date: Date): string =>
  `${date.getUTCFullYear()}.${date.getUTCMonth() + 1}.${date.getUTCDate()}`;

type RatesDocument = { date: string } & Record<
  string,
  string | Record<string, number>
>;

/**
 * Re-express a USD-based rate document with `target` as the base.
 *
 * `usdRates[x]` means "units of x per 1 USD". `CurrencyUtils.convert(amount,
 * from, to, rates)` computes `amount / rates[from]`, so `rates[from]` must mean
 * "units of `from` per 1 unit of `to`" — which is `usdRates[from] /
 * usdRates[to]`. Getting this direction wrong inverts every conversion in the
 * app without ever throwing, so it is covered by tests.
 */
export const deriveRatesFor = (
  target: string,
  usdRates: Record<string, number>,
): Record<string, number> => {
  const code = CurrencyUtils.normalizeCode(target);
  const divisor = usdRates[code];

  if (!Number.isFinite(divisor) || divisor === 0) {
    return {};
  }

  const derived: Record<string, number> = {};

  for (const [key, value] of Object.entries(usdRates)) {
    if (!Number.isFinite(value) || value === 0) continue;
    derived[key] = value / (divisor as number);
  }

  return derived;
};

type CurrencyServiceDeps = {
  fxRateRepository: {
    findByBase: (
      base: string,
    ) => Promise<{ rates: Record<string, number>; rateDate: string } | null>;
    upsert: (
      base: string,
      rates: Record<string, number>,
      rateDate: string,
    ) => Promise<void>;
  };
  fetchDocument: (version: string) => Promise<RatesDocument>;
};

const fetchDocument = async (version: string): Promise<RatesDocument> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(cdnUrl(version), {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Currency CDN responded with ${response.status}`);
    }

    return (await response.json()) as RatesDocument;
  } finally {
    clearTimeout(timeout);
  }
};

const defaultDeps: CurrencyServiceDeps = {
  fxRateRepository: FxRateRepository,
  fetchDocument,
};

export class CurrencyService {
  /**
   * Rates for `baseCurrency`, read from Postgres. Never performs an outbound
   * fetch — a missing table row yields an empty map, and CurrencyUtils.convert
   * then leaves amounts in their original currency rather than inventing a
   * number.
   */
  static async getRates(
    baseCurrency: string,
    deps: CurrencyServiceDeps = defaultDeps,
  ): Promise<Record<string, number>> {
    const stored = await deps.fxRateRepository.findByBase(STORED_BASE);

    if (!stored) {
      console.error(
        "[currency] no fx_rates row; conversion disabled this request",
      );
      return {};
    }

    return deriveRatesFor(baseCurrency, stored.rates);
  }

  /**
   * Fetch today's immutable CDN build and store it. Falls back to yesterday's
   * tag (the publisher's build can lag the UTC date), then to `latest`.
   * Called by the daily Worker cron.
   */
  static async refreshRates(
    deps: CurrencyServiceDeps = defaultDeps,
    now: Date = new Date(),
  ): Promise<{ rateDate: string; codes: number }> {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const candidates = [dateTag(now), dateTag(yesterday), "latest"];
    let lastError: unknown = null;

    for (const version of candidates) {
      try {
        const document = await deps.fetchDocument(version);
        const rates = document[STORED_BASE];

        if (typeof rates !== "object" || rates === null) {
          throw new Error(
            `Document for ${version} has no "${STORED_BASE}" key`,
          );
        }

        const rateDate =
          typeof document.date === "string" ? document.date : version;

        await deps.fxRateRepository.upsert(STORED_BASE, rates, rateDate);

        return { rateDate, codes: Object.keys(rates).length };
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `Currency refresh failed for all versions ${candidates.join(", ")}: ${String(lastError)}`,
    );
  }
}
