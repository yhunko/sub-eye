import type { SubscriptionDto } from "@subeye/shared";

export type SubscriptionGroupBy = "none" | "category" | "period" | "currency";

/** The bucket every subscription that has no value for the dimension falls into. */
export const UNGROUPED_KEY = "";
/** The single section the ungrouped list renders under; its header draws nothing. */
export const ALL_KEY = "__all";

export type SubscriptionSection = {
  key: string;
  /**
   * A heading that comes from the DATA rather than the catalogue — a category's
   * emoji and name. `null` everywhere else, because those headings are
   * translated constants and resolving them here would freeze the string in
   * whichever locale was active at import.
   */
  label: string | null;
  /**
   * Sum of `billing.preferred.monthly` across the section — normalised, so a
   * yearly group is comparable to a monthly one instead of being twelve times
   * louder.
   *
   * Totals WHAT IS ON SCREEN, filters included. A header that quietly counted
   * rows the list is hiding is a number the user cannot reconcile against
   * anything they can see.
   */
  total: number;
  currencyCode: string;
  data: SubscriptionDto[];
};

function bucketOf(
  item: SubscriptionDto,
  groupBy: Exclude<SubscriptionGroupBy, "none">,
): [key: string, label: string | null] {
  switch (groupBy) {
    case "category":
      return item.category
        ? [item.category.id, `${item.category.emoji} ${item.category.name}`]
        : [UNGROUPED_KEY, null];
    case "currency":
      return [item.currency, null];
    default:
      // ponytail: the UNIT only, so a plan billed every 3 months lands under
      // "Monthly". Split on `${item.every}:${item.period}` when quarterly plans
      // deserve their own heading — that needs plural forms this catalogue
      // deliberately does not carry (Hermes has no Intl.PluralRules).
      return [item.period, null];
  }
}

/**
 * Sections for the list, already ordered, with a money total per heading.
 *
 * Runs over the array `applySubscriptionFilters` returned, so the incoming order
 * is the user's chosen sort and pushing in encounter order preserves it inside
 * every section.
 */
export function groupSubscriptions(
  items: readonly SubscriptionDto[],
  groupBy: SubscriptionGroupBy,
): SubscriptionSection[] {
  if (!items.length) return [];

  const total = (rows: readonly SubscriptionDto[]) =>
    Number(
      rows
        .reduce((sum, row) => sum + row.billing.preferred.monthly, 0)
        .toFixed(2),
    );

  if (groupBy === "none") {
    return [
      {
        key: ALL_KEY,
        label: null,
        total: total(items),
        currencyCode: items[0]?.billing.preferred.currencyCode ?? "",
        data: [...items],
      },
    ];
  }

  const sections = new Map<string, SubscriptionSection>();
  for (const item of items) {
    const [key, label] = bucketOf(item, groupBy);
    const section = sections.get(key);
    if (section) {
      section.data.push(item);
      continue;
    }
    sections.set(key, {
      key,
      label,
      total: 0,
      currencyCode: item.billing.preferred.currencyCode,
      data: [item],
    });
  }

  // Summed after bucketing rather than incrementally: adding floats one at a
  // time and rounding once at the end is the same arithmetic the section header
  // prints, so the headings cannot disagree with a total recomputed elsewhere.
  for (const section of sections.values()) section.total = total(section.data);

  return [...sections.values()].sort((a, b) => {
    // The catch-all sinks regardless of size — a bucket named after the absence
    // of a value should never be the first heading on the screen.
    const aUngrouped = a.key === UNGROUPED_KEY;
    const bUngrouped = b.key === UNGROUPED_KEY;
    if (aUngrouped !== bUngrouped) return aUngrouped ? 1 : -1;
    return b.total - a.total;
  });
}
