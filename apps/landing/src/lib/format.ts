import type { Locale } from "./site";

/**
 * The five symbols the app ships, with the same en-US grouping as `formatMoney`
 * in `apps/mobile/src/shared/lib/format/money.ts`. Not imported from there —
 * that file is app-internal and this is five characters — but
 * `test/pricing.test.ts` pins the code set against it, so a sixth currency in
 * the app fails this workspace's tests.
 */
const SYMBOLS: Record<string, string> = {
  uah: "₴",
  usd: "$",
  eur: "€",
  gbp: "£",
  pln: "zł",
};

/**
 * Currencies whose symbol trails the amount: "199 ₴", "50 zł".
 *
 * The app prefixes every symbol; this page does not, because trailing is the
 * local convention for both — and the Ukrainian page is not a courtesy locale.
 */
const TRAILING = new Set(["uah", "pln"]);

export const money = (
  amount: number,
  currency: string,
  decimals = 2,
): string => {
  const code = currency.trim().toLowerCase();
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  const symbol = SYMBOLS[code];

  if (!symbol) return `${formatted} ${code.toUpperCase()}`;
  // Non-breaking space: an amount must never wrap away from its currency.
  return TRAILING.has(code)
    ? `${formatted} ${symbol}`
    : `${symbol}${formatted}`;
};

/** A short payment date, in the reader's own locale. */
export const shortDate = (locale: Locale, iso: string): string =>
  new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
