import {
  deriveRatesFor,
  type FxDocument,
  fxDocumentUrl,
  fxVersionCandidates,
  readFxDocument,
  STORED_BASE,
} from "@subeye/money";
import { FxRateRepository } from "./fxRateRepository";

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
  fetchDocument: (version: string) => Promise<FxDocument>;
};

const fetchDocument = async (version: string): Promise<FxDocument> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(fxDocumentUrl(version), {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Currency CDN responded with ${response.status}`);
    }

    return (await response.json()) as FxDocument;
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
    const candidates = fxVersionCandidates(now);
    let lastError: unknown = null;

    for (const version of candidates) {
      try {
        const document = await deps.fetchDocument(version);
        const read = readFxDocument(document);

        if (!read) {
          throw new Error(
            `Document for ${version} has no "${STORED_BASE}" key`,
          );
        }

        // A document without its own date is stamped with the version tag it
        // came from, so the stored row still says which build it is.
        const rateDate = read.rateDate || version;

        await deps.fxRateRepository.upsert(STORED_BASE, read.rates, rateDate);

        return { rateDate, codes: Object.keys(read.rates).length };
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `Currency refresh failed for all versions ${candidates.join(", ")}: ${String(lastError)}`,
    );
  }
}
