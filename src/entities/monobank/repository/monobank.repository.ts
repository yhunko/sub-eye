import axios, { AxiosInstance } from "axios";
import { MonobankCurrencyDto } from "../model/dtos";
import * as Sentry from "@sentry/nextjs";

export class MonobankRepository {
  protected client: AxiosInstance;

  private static cache: MonobankCurrencyDto[] | null = null;
  private static lastFetchTime: number = 0;

  // Set to 1 hour (60 minutes * 60 seconds * 1000 milliseconds)
  private static readonly CACHE_TTL = 60 * 60 * 1000;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_MONOBANK_API_URL,
    });
  }

  async getCurrencies(): Promise<MonobankCurrencyDto[]> {
    const now = Date.now();
    const hasCache = MonobankRepository.cache !== null;
    const isCacheFresh =
      now - MonobankRepository.lastFetchTime < MonobankRepository.CACHE_TTL;

    if (hasCache && isCacheFresh) {
      return MonobankRepository.cache!;
    }

    try {
      const { data } =
        await this.client.get<MonobankCurrencyDto[]>("/bank/currency");

      MonobankRepository.cache = data;
      MonobankRepository.lastFetchTime = now;

      return data;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { source: "get-monobank-currencies" },
        extra: {
          hasStaleCache: hasCache,
        },
      });

      // If request fails, return stale cache as a fallback, otherwise empty array
      return MonobankRepository.cache ?? [];
    }
  }
}
