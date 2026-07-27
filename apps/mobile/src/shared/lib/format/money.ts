// Currency presentation for the mobile client, and the only place it is defined.
//
// The table stays local rather than shared: importing a symbol lookup from
// @subeye/shared would drag that whole barrel (valibot schemas, date-fns
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

/** Picker order follows the table above — reordering it reorders every picker. */
export const CURRENCY_CODES = Object.keys(SYMBOLS);

/** "🇺🇦 UAH". Unknown codes lose the flag rather than the row. */
export function currencyLabel(currencyCode: string): string {
  const code = currencyCode.trim().toLowerCase();
  const flag = SYMBOLS[code]?.flag;
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
  const currency = SYMBOLS[code];

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

/**
 * The converted (home-currency) amount, plus the amount as actually charged when
 * those differ. This is the multi-currency disclosure: totals are UAH, the charge
 * is USD, and hiding one of the two is what makes the numbers feel wrong.
 */
export function formatConverted(
  converted: number,
  convertedCode: string,
  original: number,
  originalCode: string,
): string {
  const head = formatMoney(converted, convertedCode);
  if (
    convertedCode.trim().toLowerCase() === originalCode.trim().toLowerCase()
  ) {
    return head;
  }
  return `${head} · ${formatMoney(original, originalCode)}`;
}
