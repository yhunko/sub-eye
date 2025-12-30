export type Currency = {
  code: string;
  symbol: string;
  format: string;
  flagEmoji: string;
};

export const CurrenciesMap = new Map<number, Currency>([
  [
    840,
    {
      code: "USD",
      symbol: "$",
      format: "en-US",
      flagEmoji: "🇺🇸",
    },
  ],
  [
    980,
    {
      code: "UAH",
      symbol: "₴",
      format: "uk-UA",
      flagEmoji: "🇺🇦",
    },
  ],
]);
