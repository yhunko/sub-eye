export type MonobankCurrencyDto = {
  currencyCodeA: number;
  currencyCodeB: number;
  date: Date;
  rateSell: number;
  rateBuy: number;
  rateCross: number;
};

export interface CurrencyDto extends MonobankCurrencyDto {
  from: string;
  to: string;
}
