import { CurrencyRepository } from "./currencyRepository";

export class CurrencyService {
  static async getRates(
    normalizedBase: string,
  ): Promise<Record<string, number>> {
    const ratesDto = await CurrencyRepository.getRates(normalizedBase);

    return ratesDto?.[normalizedBase] ?? {};
  }
}
