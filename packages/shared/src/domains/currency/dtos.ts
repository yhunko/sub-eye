export type CurrencyRatesDto = {
  date: string;
} & {
  [baseCurrency: string]: Record<string, number>;
};
