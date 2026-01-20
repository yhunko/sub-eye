import axios from "axios";
import { CurrencyRatesDto } from "../model/dtos";
import * as Sentry from "@sentry/nextjs";

export class CurrencyRepository {
  private static cache = new Map<string, CurrencyRatesDto>();
  private static lastFetchTime = new Map<string, number>();

  // Set to 24 hours (24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000;

  private readonly PRIMARY_BASE_URL =
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1";
  private readonly FALLBACK_BASE_URL =
    "https://latest.currency-api.pages.dev/v1";

  async getRates(base: string): Promise<CurrencyRatesDto | null> {
    const now = Date.now();
    const lastFetch = CurrencyRepository.lastFetchTime.get(base) || 0;
    const isCacheFresh = now - lastFetch < CurrencyRepository.CACHE_TTL;
    const cachedData = CurrencyRepository.cache.get(base);

    if (cachedData && isCacheFresh) {
      return cachedData;
    }

    const endpoint = `/currencies/${base}.json`;

    try {
      const { data } = await axios.get<CurrencyRatesDto>(
        `${this.PRIMARY_BASE_URL}${endpoint}`,
        { timeout: 10000 },
      );

      this.updateCache(base, data, now);

      return data;
    } catch (primaryError) {
      Sentry.addBreadcrumb({
        category: "currency",
        message: "Primary currency API failed, trying fallback",
        level: "warning",
        data: { base, error: primaryError },
      });

      try {
        const { data } = await axios.get<CurrencyRatesDto>(
          `${this.FALLBACK_BASE_URL}${endpoint}`,
          { timeout: 10000 },
        );

        this.updateCache(base, data, now);

        return data;
      } catch (fallbackError) {
        Sentry.captureException(fallbackError, {
          tags: { source: "get-currency-rates" },
          extra: { base, primaryError, hasStaleCache: !!cachedData },
        });

        return cachedData ?? null;
      }
    }
  }

  private updateCache(
    base: string,
    data: CurrencyRatesDto,
    timestamp: number,
  ): void {
    CurrencyRepository.cache.set(base, data);
    CurrencyRepository.lastFetchTime.set(base, timestamp);
  }
}
