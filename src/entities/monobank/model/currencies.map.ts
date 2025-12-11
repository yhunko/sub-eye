export type Currency = {
  code: string;
  symbol: string;
};

export const CurrenciesMap = new Map<number, Currency>([
  [
    840,
    {
      code: "USD",
      symbol: "$",
    },
  ],
  [
    980,
    {
      code: "UAH",
      symbol: "₴",
    },
  ],
]);
