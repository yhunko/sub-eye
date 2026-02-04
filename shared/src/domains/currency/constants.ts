import type { Currency } from "./types";

export const CurrenciesMap = new Map<string, Currency>([
  [
    "USD",
    {
      code: "USD",
      symbol: "$",
      format: "en-US",
      flagEmoji: "🇺🇸",
    },
  ],
  [
    "EUR",
    {
      code: "EUR",
      symbol: "€",
      format: "de-DE",
      flagEmoji: "🇪🇺",
    },
  ],
  [
    "UAH",
    {
      code: "UAH",
      symbol: "₴",
      format: "uk-UA",
      flagEmoji: "🇺🇦",
    },
  ],
  [
    "GBP",
    {
      code: "GBP",
      symbol: "£",
      format: "en-GB",
      flagEmoji: "🇬🇧",
    },
  ],
  [
    "PLN",
    {
      code: "PLN",
      symbol: "zł",
      format: "pl-PL",
      flagEmoji: "🇵🇱",
    },
  ],
]);
