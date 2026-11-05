import type { Locale } from "./site";

/**
 * The symbols this page actually PRINTS — the mockup's three and the Pro price's
 * three — with the same en-US grouping as `Display.money` in
 * `apps/ios/Shared/Localization.swift`. The app's own catalogue is 155
 * currencies now; this is not a copy of it and must not become one. It is not
 * imported either: that file is app-internal, and this is five characters.
 * `test/pricing.test.ts` pins every code the page prints against the app's
 * catalogue, so a currency the app drops fails this workspace's tests.
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

/** A full calendar day. `timeZone: "UTC"` because an ISO day parses to UTC midnight. */
export const longDate = (locale: Locale, iso: string): string =>
  new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));

/** "February 2026" from "2026-02". */
export const monthYear = (locale: Locale, month: string): string =>
  new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));
