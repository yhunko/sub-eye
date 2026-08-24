// Currency presentation for the mobile client, and the only place it is defined.
//
// The table stays local rather than shared: importing a symbol lookup from
// @subeye/model would drag that whole barrel (valibot schemas, date-fns
// timezone utils) into the Metro bundle. The server only rounds amounts and
// sends the currency code; symbols and grouping exist nowhere else, so there is
// nothing to keep in sync. These five codes are the complete set the product
// supports.
const SYMBOLS: Record<
  string,
  { symbol: string; locale: string; flag: string }
> = {
  uah: { symbol: "₴", locale: "uk-UA", flag: "🇺🇦" },
  usd: { symbol: "$", locale: "en-US", flag: "🇺🇸" },
  eur: { symbol: "€", locale: "de-DE", flag: "🇪🇺" },
  gbp: { symbol: "£", locale: "en-GB", flag: "🇬🇧" },
  pln: { symbol: "zł", locale: "pl-PL", flag: "🇵🇱" },
};

/**
 * The only way to read the table. A plain `SYMBOLS[code]` walks the prototype,
 * so "constructor" comes back as `Object` — truthy, and then `.symbol` is
 * undefined and every amount renders as "undefined1,234.50".
 */
function currencyFor(code: string) {
  return Object.hasOwn(SYMBOLS, code) ? SYMBOLS[code] : undefined;
}

/** Picker order follows the table above — reordering it reorders every picker. */
export const CURRENCY_CODES = Object.keys(SYMBOLS);

/**
 * A region's currency code narrowed to the five SubEye supports, or null.
 *
 * Takes the code as a parameter instead of reading `expo-localization` here:
 * this file deliberately imports nothing (see the note above), and `bun:test`
 * cannot load a native module. The caller passes
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
  const flag = currencyFor(code)?.flag;
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
  const currency = currencyFor(code);

  if (!currency) {
    return `${amount.toFixed(decimals)} ${code.toUpperCase()}`;
  }

  // en-US grouping deliberately, not the currency's own locale: the tests and the
  // UI want one consistent thousands separator, and uk-UA groups with a narrow
  // no-break space that reads as a broken glyph in several RN fonts.
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return `${currency.symbol}${formatted}`;
}
