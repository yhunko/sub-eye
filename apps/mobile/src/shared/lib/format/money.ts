// Currency presentation for the mobile client, over the catalogue in
// `./currencies`.
//
// It stays local rather than shared: importing a symbol lookup from
// @subeye/model would drag that whole barrel (valibot schemas, date-fns timezone
// utils) into the Metro bundle. Symbols, flags and names exist nowhere else, so
// there is nothing to keep in sync.
import { CURRENCIES } from "./currencies";

/**
 * The only way to read the catalogue. A plain `CURRENCIES[code]` walks the
 * prototype, so "constructor" comes back as `Object` — truthy, and then
 * `.symbol` is undefined and every amount renders as "undefined1,234.50".
 */
function currencyFor(code: string) {
  return Object.hasOwn(CURRENCIES, code) ? CURRENCIES[code] : undefined;
}

/** Alphabetical by code — the order the picker's A–Z sections are cut from. */
export const CURRENCY_CODES = Object.keys(CURRENCIES);

/**
 * The picker's "Suggested" section. The device's own currency and whatever is
 * already selected are prepended at runtime; these are what is left after them.
 *
 * The first five are the only currencies the app supported before the catalogue
 * existed, so a user who had picked one still finds it without scrolling.
 */
export const POPULAR_CURRENCY_CODES = [
  "usd",
  "eur",
  "gbp",
  "uah",
  "pln",
  "chf",
  "jpy",
  "cad",
  "aud",
];

// ISO 4217 builds a code out of the ISO 3166 country code plus a currency
// initial, so the first two letters ARE the country and a regional-indicator
// pair renders its flag. The exceptions are the supranational X-codes, which
// name no country at all — "XA" would render as two letters in boxes.
const FLAG_OVERRIDE: Record<string, string> = {
  xaf: "🌍",
  xof: "🌍",
  xcd: "🌎",
  xcg: "🇨🇼",
  xpf: "🇵🇫",
};

/** The currency's flag, or "" for a code the app does not hold. */
export function currencyFlag(currencyCode: string): string {
  const code = currencyCode.trim().toLowerCase();
  if (!currencyFor(code)) return "";

  const override = Object.hasOwn(FLAG_OVERRIDE, code)
    ? FLAG_OVERRIDE[code]
    : undefined;
  if (override) return override;

  return String.fromCodePoint(
    ...[...code.slice(0, 2)].map(
      (letter) => 0x1f1e6 + letter.charCodeAt(0) - 97,
    ),
  );
}

/** "US Dollar", or undefined for a code the app does not hold. */
export function currencyName(currencyCode: string): string | undefined {
  return currencyFor(currencyCode.trim().toLowerCase())?.name;
}

/**
 * The currency's symbol, or undefined where CLDR has none and the "symbol" is
 * the code itself — a third of the catalogue is like that, and a row printing
 * "AED" twice reads as a rendering bug rather than as a currency.
 */
export function currencySymbol(currencyCode: string): string | undefined {
  const code = currencyCode.trim().toLowerCase();
  const symbol = currencyFor(code)?.symbol;
  return symbol && symbol.toLowerCase() !== code ? symbol : undefined;
}

/**
 * A region's currency code narrowed to what SubEye can hold, or null.
 *
 * Takes the code as a parameter instead of reading `expo-localization` here:
 * this file deliberately imports nothing native (see the note above), and
 * `bun:test` cannot load a native module. The caller passes
 * `getLocales()[0]?.currencyCode`, which is `string | null` on every platform.
 */
export function supportedCurrencyCode(
  raw: string | null | undefined,
): string | null {
  const code = raw?.trim().toLowerCase();
  return code && currencyFor(code) ? code : null;
}

/** "🇺🇦 UAH". Unknown codes lose the flag rather than the row. */
export function currencyLabel(currencyCode: string): string {
  const code = currencyCode.trim().toLowerCase();
  const flag = currencyFlag(code);
  return flag ? `${flag} ${code.toUpperCase()}` : code.toUpperCase();
}

/**
 * Reads a price the user typed. Accepts "1 299,50" and "1299.50" alike — a
 * numeric keypad in a uk-UA locale emits a comma, and a pasted price brings its
 * grouping with it. Returns null when there is no number in there at all, so
 * callers can tell "empty or gibberish" apart from a legitimate zero.
 */
export function parsePrice(input: string): number | null {
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  if (normalized === "" || normalized === ".") return null;
  if (!/^\d*\.?\d*$/.test(normalized)) return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatMoney(
  amount: number,
  currencyCode: string,
  options?: { decimals?: number },
): string {
  const code = currencyCode.trim().toLowerCase();
  const decimals = options?.decimals ?? 2;

  // en-US grouping deliberately, not the currency's own locale: the tests and the
  // UI want one consistent thousands separator, and uk-UA groups with a narrow
  // no-break space that reads as a broken glyph in several RN fonts.
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  // A code-as-symbol trails the amount the way an unknown code does:
  // "AED1,234.50" reads as a typo, "1,234.50 AED" reads as money.
  const symbol = currencySymbol(code);
  return symbol
    ? `${symbol}${formatted}`
    : `${formatted} ${code.toUpperCase()}`;
}
