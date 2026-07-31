import type { Locale } from "./site";

/**
 * Figures for the app mockups. Per locale because a Ukrainian visitor reading a
 * dollar dashboard is a courtesy locale, and the brief is explicit that
 * Ukrainian is not one. The category amounts sum to `nextMonth` — the breakdown
 * is of the monthly run-rate, not of what is left to pay.
 */

export type SpendPanel = {
  currency: string;
  left: number;
  nextMonth: number;
  day: number;
  daysInMonth: number;
  subscriptions: number;
  categories: number[];
};

export const spendPanel: Record<Locale, SpendPanel> = {
  en: {
    currency: "usd",
    left: 84.96,
    nextMonth: 186.4,
    day: 18,
    daysInMonth: 31,
    subscriptions: 12,
    categories: [52.97, 44.99, 29.99, 21.98, 36.47],
  },
  uk: {
    currency: "uah",
    left: 3545,
    nextMonth: 7777,
    day: 18,
    daysInMonth: 31,
    subscriptions: 12,
    categories: [2199, 1890, 1260, 899, 1529],
  },
};

/**
 * The mockup's "today". Fixed rather than `new Date()` so the build stays
 * reproducible for the Turbo cache — and chosen to agree with `spendPanel.day`:
 * the 18th of a 31-day month.
 */
export const MOCK_TODAY = new Date("2026-07-18T00:00:00.000Z");

export type UpcomingRow = {
  name: string;
  /** Days from `MOCK_TODAY`. Under a week reads as a countdown, then as a date. */
  inDays: number;
  amount: Record<Locale, number>;
  /** Charged in another currency, shown next to the converted amount. */
  foreign?: { amount: number; currency: string };
};

export const upcomingRows: UpcomingRow[] = [
  { name: "Spotify", inDays: 0, amount: { en: 9.99, uk: 199 } },
  { name: "Netflix", inDays: 3, amount: { en: 15.99, uk: 649 } },
  {
    name: "Figma",
    inDays: 18,
    amount: { en: 13.0, uk: 546 },
    foreign: { amount: 12, currency: "eur" },
  },
  { name: "Adobe CC", inDays: 31, amount: { en: 59.99, uk: 2499 } },
];
