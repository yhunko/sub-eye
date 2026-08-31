import { CURRENCY_CODES, currencyName } from "@/shared/lib/format";

export type CurrencySection = { title: string; data: string[] };

const nameOf = (code: string): string =>
  currencyName(code)?.toLowerCase() ?? "";

/**
 * Where a hit sits relative to what was typed. "us" has to answer USD before
 * the Australian Dollar — a code the user is halfway through typing outranks a
 * name that merely contains the same two letters.
 */
const rank = (code: string, needle: string): number => {
  if (code === needle) return 0;
  if (code.startsWith(needle)) return 1;
  if (nameOf(code).startsWith(needle)) return 2;
  return 3;
};

/**
 * The picker's list, grouped.
 *
 * At rest: a "Suggested" card the caller composes, then one card per initial —
 * 156 codes is far past the point where a single flat list is scannable, and
 * the initial is what a user reaches for when they already know the code.
 *
 * Under a query the alphabet collapses into ONE list. Letter headings over three
 * results are chrome, and the order that matters then is relevance, not
 * position in the alphabet.
 */
export function currencySections({
  search,
  suggested,
  suggestedTitle,
  resultsTitle,
}: {
  search: string;
  /** Device currency, current selection, majors — deduped and ordered by the caller. */
  suggested: string[];
  suggestedTitle: string;
  resultsTitle: string;
}): CurrencySection[] {
  const needle = search.trim().toLowerCase();

  if (needle) {
    const hits = CURRENCY_CODES.filter(
      (code) => code.includes(needle) || nameOf(code).includes(needle),
    ).sort((a, b) => rank(a, needle) - rank(b, needle));

    return hits.length ? [{ title: resultsTitle, data: hits }] : [];
  }

  const sections: CurrencySection[] = suggested.length
    ? [{ title: suggestedTitle, data: suggested }]
    : [];

  // CURRENCY_CODES is generated alphabetically, so one pass cuts the letters.
  for (const code of CURRENCY_CODES) {
    const initial = code.slice(0, 1).toUpperCase();
    const open = sections.at(-1);
    if (!open || open.title !== initial) {
      sections.push({ title: initial, data: [code] });
    } else {
      open.data.push(code);
    }
  }

  return sections;
}
