import axios, { AxiosInstance } from "axios";
import { MonobankCurrencyDto } from "../model/dtos";

export class MonobankRepository {
  protected client: AxiosInstance;

  private static cache: MonobankCurrencyDto[] = [];
  private static lastFetchTime: number = 0;

  private static readonly CACHE_TTL = 10 * 60 * 1000;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_MONOBANK_API_URL,
    });
  }

  async getCurrencies(): Promise<MonobankCurrencyDto[]> {
    const now = Date.now();
    const isCacheValid =
      MonobankRepository.cache &&
      now - MonobankRepository.lastFetchTime < MonobankRepository.CACHE_TTL;

    if (isCacheValid && MonobankRepository.cache) {
      return MonobankRepository.cache;
    }

    try {
      const { data } =
        await this.client.get<MonobankCurrencyDto[]>("/bank/currency");

      MonobankRepository.cache = data;
      MonobankRepository.lastFetchTime = now;

      return data;
    } catch (error) {
      // TODO: Add Sentry
      if (MonobankRepository.cache) {
        return MonobankRepository.cache;
      }

      return [];
    }
  }
}
