import { CurrencyRepository } from "../repository/currency.repository";
import { CurrencyUtils } from "@/shared/lib/currency.utils";

export class CurrencyService {
  constructor(private repository = new CurrencyRepository()) {}

  async getRates(base: string) {
    const normalizedBase = CurrencyUtils.normalizeCode(base);
    const rates = await this.repository.getRates(normalizedBase);

    return rates?.[normalizedBase] ?? {};
  }
}
