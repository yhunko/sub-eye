import {
  extractRateTable,
  type RateProvider,
  type RateTable,
} from "@subeye/currency";
import { CurrencyRepository } from "./currencyRepository";

export type CurrencyServiceDeps = {
  provider: RateProvider;
};

const defaultDeps: CurrencyServiceDeps = {
  provider: CurrencyRepository,
};

export class CurrencyService {
  static async getRates(
    baseCurrency: string,
    deps: CurrencyServiceDeps = defaultDeps,
  ): Promise<RateTable> {
    const response = await deps.provider.getRates(baseCurrency);

    return extractRateTable(response, baseCurrency);
  }
}
