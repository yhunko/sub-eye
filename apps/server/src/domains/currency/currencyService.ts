import { CurrencyRepository } from "./currencyRepository";

export class CurrencyService {
  static async getRates(baseCurrency: string): Promise<Record<string, number>> {
    const ratesDto = await CurrencyRepository.getRates(baseCurrency);

    return ratesDto?.[baseCurrency.toLowerCase()] ?? {};
  }
}
