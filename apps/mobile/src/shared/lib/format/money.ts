// Currency presentation for the mobile client.
//
// ponytail: a local 5-entry table instead of importing `CurrenciesMap` /
// `CurrencyUtils.formatAmount` from @subeye/shared. Those live in a package the
// server also uses; pulling them in drags the whole shared barrel (valibot
// schemas, date-fns timezone utils) into the Metro bundle for a symbol lookup.
// The five codes below are the complete set the product supports — mirrored from
// packages/shared/src/domains/currency. Add a row here and there together if a
// sixth is ever supported.
const SYMBOLS: Record<string, { symbol: string; locale: string }> = {
  usd: { symbol: "$", locale: "en-US" },
  eur: { symbol: "€", locale: "de-DE" },
  uah: { symbol: "₴", locale: "uk-UA" },
  gbp: { symbol: "£", locale: "en-GB" },
  pln: { symbol: "zł", locale: "pl-PL" },
};

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
