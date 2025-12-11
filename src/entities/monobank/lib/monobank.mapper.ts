import { MonobankCurrencyDto } from "../model/dtos";
import { CurrenciesMap } from "../model/currencies.map";

export class MonobankMapper {
  static hasAvailableCurrencies({
    currencyCodeA,
    currencyCodeB,
  }: MonobankCurrencyDto): boolean {
    return CurrenciesMap.has(currencyCodeA) && CurrenciesMap.has(currencyCodeB);
  }
}
