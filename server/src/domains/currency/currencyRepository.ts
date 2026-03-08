import type { CurrencyRatesDto } from "shared";

export class CurrencyRepository {
  private static cache = new Map<string, CurrencyRatesDto>();
  private static lastFetchTime = new Map<string, number>();
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000;

  private static readonly PRIMARY_BASE_URL =
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1";
  private static readonly FALLBACK_BASE_URL =
    "https://latest.currency-api.pages.dev/v1";

  static async getRates(base: string): Promise<CurrencyRatesDto | null> {
    const now = Date.now();
    const lastFetch = CurrencyRepository.lastFetchTime.get(base) ?? 0;
    const isCacheFresh = now - lastFetch < CurrencyRepository.CACHE_TTL;
    const cachedData = CurrencyRepository.cache.get(base);

    if (cachedData && isCacheFresh) {
      return cachedData;
    }

    const endpoint = `/currencies/${base.toLowerCase()}.json`;

    try {
      const data = await CurrencyRepository.fetchRates(
        `${CurrencyRepository.PRIMARY_BASE_URL}${endpoint}`,
      );

      CurrencyRepository.updateCache(base, data, now);

      return data;
    } catch (primaryError) {
      console.error("Primary currency API failed, trying fallback", {
        base,
        error: primaryError,
      });

      try {
        const data = await CurrencyRepository.fetchRates(
          `${CurrencyRepository.FALLBACK_BASE_URL}${endpoint}`,
        );

        CurrencyRepository.updateCache(base, data, now);

        return data;
      } catch (fallbackError) {
        console.error("Fallback currency API failed", {
          base,
          error: fallbackError,
          primaryError,
          hasStaleCache: !!cachedData,
        });

        return cachedData ?? null;
      }
    }
  }

  private static async fetchRates(url: string): Promise<CurrencyRatesDto> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Currency API responded with ${response.status}`);
      }

      return (await response.json()) as CurrencyRatesDto;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static updateCache(
    base: string,
    data: CurrencyRatesDto,
    timestamp: number,
  ): void {
    CurrencyRepository.cache.set(base, data);
    CurrencyRepository.lastFetchTime.set(base, timestamp);
  }
}
