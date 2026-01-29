import type { Currency } from "./types";

export const CurrenciesMap = new Map<string, Currency>([
  [
    "usd",
    {
      code: "USD",
      symbol: "$",
      format: "en-US",
      flagEmoji: "🇺🇸",
    },
  ],
  [
    "eur",
    {
      code: "EUR",
      symbol: "€",
      format: "de-DE",
      flagEmoji: "🇪🇺",
    },
  ],
  [
    "uah",
    {
      code: "UAH",
      symbol: "₴",
      format: "uk-UA",
      flagEmoji: "🇺🇦",
    },
  ],
  [
    "gbp",
    {
      code: "GBP",
      symbol: "£",
      format: "en-GB",
      flagEmoji: "🇬🇧",
    },
  ],
  [
    "pln",
    {
      code: "PLN",
      symbol: "zł",
      format: "pl-PL",
      flagEmoji: "🇵🇱",
    },
  ],
]);
