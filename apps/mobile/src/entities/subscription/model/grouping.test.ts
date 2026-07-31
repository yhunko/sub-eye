import { describe, expect, test } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import { ALL_KEY, groupSubscriptions, UNGROUPED_KEY } from "./grouping";
import { makeSubscription } from "./subscription.fixture";

const withMonthly = (
  id: string,
  monthly: number,
  overrides: Parameters<typeof makeSubscription>[0] = {},
) =>
  makeSubscription({
    id,
    ...overrides,
    billing: {
      original: { currencyCode: "uah", monthly },
      preferred: {
        currencyCode: "uah",
        amount: monthly,
        monthly,
        yearly: monthly * 12,
        exchangeRate: 1,
      },
    },
  });

describe("groupSubscriptions", () => {
  test("ungrouped collapses to a single section keeping the incoming order", () => {
    const items = [withMonthly("a", 10), withMonthly("b", 90)];

    const [section, ...rest] = groupSubscriptions(items, "none");

    expect(rest).toEqual([]);
    expect(section?.key).toBe(ALL_KEY);
    expect(section?.data.map((row) => row.id)).toEqual(["a", "b"]);
    // The caller already sorted; a section must never re-order inside itself.
    expect(section?.total).toBe(100);
  });

  test("empty input yields no sections, not one empty heading", () => {
    expect(groupSubscriptions([], "category")).toEqual([]);
    expect(groupSubscriptions([], "none")).toEqual([]);
  });

  test("totals the normalised monthly figure, not the amount as charged", () => {
    // A yearly plan whose `monthly` is a twelfth of what it bills. Summing
    // `amount` here would make one yearly subscription outweigh a year of
    // monthly ones in its own heading.
    const yearly = makeSubscription({
      id: "yearly",
      period: SubscriptionPeriod.YEAR,
      billing: {
        original: { currencyCode: "uah", monthly: 100 },
        preferred: {
          currencyCode: "uah",
          amount: 1200,
          monthly: 100,
          yearly: 1200,
          exchangeRate: 1,
        },
      },
    });

    const [section] = groupSubscriptions([yearly], "period");

    expect(section?.total).toBe(100);
  });

  test("float sums are rounded once, at the end", () => {
    // 0.1 + 0.2 is 0.30000000000000004 in binary floating point, and a heading
    // reading "₴0.30000000000000004" is the failure this rounding prevents.
    const [section] = groupSubscriptions(
      [withMonthly("a", 0.1), withMonthly("b", 0.2)],
      "none",
    );

    expect(section?.total).toBe(0.3);
  });

  test("sections rank by total, with the catch-all last however large", () => {
    const entertainment = { id: "cat_1", name: "Fun", emoji: "🎬" };
    const items = [
      withMonthly("small", 5, { category: entertainment }),
      withMonthly("huge", 900),
    ];

    const sections = groupSubscriptions(items, "category");

    expect(sections.map((section) => section.key)).toEqual([
      "cat_1",
      UNGROUPED_KEY,
    ]);
    expect(sections[0]?.label).toBe("🎬 Fun");
    // The uncategorised heading carries no data-derived label — the widget
    // supplies a translated one.
    expect(sections[1]?.label).toBeNull();
  });

  test("period groups by the unit, so every-3-months joins monthly", () => {
    const items = [
      makeSubscription({ id: "monthly", every: 1 }),
      makeSubscription({ id: "quarterly", every: 3 }),
      makeSubscription({
        id: "annual",
        period: SubscriptionPeriod.YEAR,
      }),
    ];

    const sections = groupSubscriptions(items, "period");

    const monthly = sections.find(
      (section) => section.key === SubscriptionPeriod.MONTH,
    );
    expect(monthly?.data.map((row) => row.id)).toEqual([
      "monthly",
      "quarterly",
    ]);
    expect(sections).toHaveLength(2);
  });

  test("currency groups by what is charged, not the preferred currency", () => {
    // Every row reports the same `preferred.currencyCode` — that is the user's
    // home currency. Grouping on it would produce exactly one section always.
    const items = [
      makeSubscription({ id: "uah", currency: "uah" }),
      makeSubscription({ id: "usd", currency: "usd" }),
    ];

    const sections = groupSubscriptions(items, "currency");

    expect(sections.map((section) => section.key).sort()).toEqual([
      "uah",
      "usd",
    ]);
  });
});
