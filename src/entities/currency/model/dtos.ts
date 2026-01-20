export type CurrencyRatesDto = {
  date: string;
} & {
  [baseCurrency: string]: Record<string, number>;
};

export type CurrencyListDto = Record<string, string>;
