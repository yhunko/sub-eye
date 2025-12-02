import { MonobankCurrencyDto, CurrencyDto } from "../model/dtos";
import { CurrenciesMap } from "../model/currencies.map";

export class MonobankMapper {
  static toDto(currency: MonobankCurrencyDto): CurrencyDto {
    const from =
      CurrenciesMap.get(currency.currencyCodeA) ?? "Unknown currency";
    const to = CurrenciesMap.get(currency.currencyCodeB) ?? "Unknown currency";

    return {
      ...currency,
      from,
      to,
    };
  }

  static hasAvailableCurrencies({
    currencyCodeA,
    currencyCodeB,
  }: MonobankCurrencyDto): boolean {
    return CurrenciesMap.has(currencyCodeA) && CurrenciesMap.has(currencyCodeB);
  }
}
