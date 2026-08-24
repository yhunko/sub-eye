import { describe, expect, test } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { repeatRuleFor } from "../src";

/**
 * The three numbering conventions asserted below are expo's, and all three are
 * off-by-one traps that an assertion on `unit` alone would never catch. They are
 * verified against the code that converts a rule into a native trigger, not the
 * doc comments:
 *
 * - `weekly.weekday` 1–7, Sunday = 1 — `WeeklyTriggerRecord` hands it straight
 *   to `DateComponents.weekday` (`expo-notifications/ios/…/TriggerRecords.swift`),
 *   and Android to `Calendar.DAY_OF_WEEK`. Both are 1-based from Sunday.
 * - `monthly.day` 1-based, likewise passed through untouched.
 * - `yearly.month` 0-BASED: `YearlyTriggerRecord` writes `month: self.month + 1`
 *   with the comment "iOS months are 1-based, JS months are 0-based".
 */

const monthlyOnThe14th = {
  id: "s1",
  name: "Netflix",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  nextPaymentDate: "2026-09-14T00:00:00.000Z",
  status: "active" as const,
  billing: {
    original: { currencyCode: "usd", monthly: 15 },
    preferred: {
      currencyCode: "uah",
      amount: 620,
      monthly: 620,
      yearly: 7440,
      exchangeRate: 41.3,
    },
  },
};

describe("repeatRuleFor", () => {
  test("a plain monthly subscription repeats on the lead day", () => {
    expect(repeatRuleFor(monthlyOnThe14th, 1, 9, 0)).toEqual({
      unit: "monthly",
      day: 13,
      hour: 9,
      minute: 0,
    });
  });

  // Day 30 does not exist in February, and a MONTHLY trigger on a day the month
  // lacks does not fire — silently. One missed renewal a year is worse than a
  // one-shot reminder that at least fires.
  test("a fire day above 28 is refused", () => {
    const onThe31st = {
      ...monthlyOnThe14th,
      nextPaymentDate: "2026-10-31T00:00:00.000Z",
    };
    expect(repeatRuleFor(onThe31st, 1, 9, 0)).toBeNull();

    // The boundary itself is admitted: 29 - 1 = 28 exists in every month.
    const onThe29th = {
      ...monthlyOnThe14th,
      nextPaymentDate: "2026-10-29T00:00:00.000Z",
    };
    expect(repeatRuleFor(onThe29th, 1, 9, 0)).toMatchObject({ day: 28 });
  });

  // "Three days before the 2nd" is 30 Jan, 27 Feb, 30 Mar — a different
  // day-of-month every month, which no monthly rule can express.
  test("a lead that crosses the month boundary is refused", () => {
    const onThe2nd = {
      ...monthlyOnThe14th,
      nextPaymentDate: "2026-09-02T00:00:00.000Z",
    };
    expect(repeatRuleFor(onThe2nd, 3, 9, 0)).toBeNull();

    // Day 1 with a one-day lead lands on day 0, which is the same failure.
    const onThe1st = {
      ...monthlyOnThe14th,
      nextPaymentDate: "2026-09-01T00:00:00.000Z",
    };
    expect(repeatRuleFor(onThe1st, 1, 9, 0)).toBeNull();
  });

  test("every > 1 has no calendar unit", () => {
    expect(
      repeatRuleFor({ ...monthlyOnThe14th, every: 3 }, 1, 9, 0),
    ).toBeNull();
  });

  // These three are the correctness guard, not an optimisation: a repeating
  // trigger keeps firing whatever the subscription becomes, and the app is not
  // open to notice a date-driven transition.
  test.each([
    ["paused", { status: "paused" as const }],
    ["cancelling", { status: "cancelling" as const }],
    ["cancelled", { status: "cancelled" as const }],
  ])("a %s subscription is refused", (_label, patch) => {
    expect(
      repeatRuleFor({ ...monthlyOnThe14th, ...patch }, 1, 9, 0),
    ).toBeNull();
  });

  test("a pending price change is refused — the baked amount would go stale", () => {
    const withPending = {
      ...monthlyOnThe14th,
      upcomingPhase: { billing: monthlyOnThe14th.billing },
    };
    expect(repeatRuleFor(withPending, 1, 9, 0)).toBeNull();
  });

  test("an active trial is refused for the same reason", () => {
    const onTrial = {
      ...monthlyOnThe14th,
      pricePhases: [
        {
          kind: "trial" as const,
          endsAt: "2026-09-30T00:00:00.000Z",
          isActive: true,
        },
      ],
    };
    expect(repeatRuleFor(onTrial, 1, 9, 0)).toBeNull();

    // A trial that has already ended changes nothing, so it must not disqualify.
    const pastTrial = {
      ...monthlyOnThe14th,
      pricePhases: [
        {
          kind: "trial" as const,
          endsAt: "2026-08-30T00:00:00.000Z",
          isActive: false,
        },
      ],
    };
    expect(repeatRuleFor(pastTrial, 1, 9, 0)).toMatchObject({
      unit: "monthly",
    });
  });

  test("weekly and daily are always expressible", () => {
    // 14 Sep 2026 is a Monday, so a one-day lead fires on Sunday — weekday 1,
    // NOT `Date.getDay()`'s 0.
    expect(
      repeatRuleFor(
        { ...monthlyOnThe14th, period: SubscriptionPeriod.WEEK },
        1,
        9,
        0,
      ),
    ).toEqual({ unit: "weekly", weekday: 1, hour: 9, minute: 0 });

    // A lead of 7 on a weekly plan lands on the same weekday as the payment.
    expect(
      repeatRuleFor(
        { ...monthlyOnThe14th, period: SubscriptionPeriod.WEEK },
        7,
        9,
        0,
      ),
    ).toEqual({ unit: "weekly", weekday: 2, hour: 9, minute: 0 });

    // A daily plan fires every day regardless of the lead — the lead only
    // changes which charge the copy names.
    expect(
      repeatRuleFor(
        { ...monthlyOnThe14th, period: SubscriptionPeriod.DAY },
        0,
        9,
        0,
      ),
    ).toEqual({ unit: "daily", hour: 9, minute: 0 });
    expect(
      repeatRuleFor(
        { ...monthlyOnThe14th, period: SubscriptionPeriod.DAY },
        3,
        7,
        30,
      ),
    ).toEqual({ unit: "daily", hour: 7, minute: 30 });
  });

  test("a yearly month is 0-based, so January is 0", () => {
    const inJanuary = {
      ...monthlyOnThe14th,
      period: SubscriptionPeriod.YEAR,
      nextPaymentDate: "2027-01-15T00:00:00.000Z",
    };
    expect(repeatRuleFor(inJanuary, 1, 9, 0)).toEqual({
      unit: "yearly",
      month: 0,
      day: 14,
      hour: 9,
      minute: 0,
    });

    // A lead that walks back into the previous year keeps the day-of-year, so
    // the rule is December of the year before — still one instant a year.
    const inJanuaryEarly = {
      ...monthlyOnThe14th,
      period: SubscriptionPeriod.YEAR,
      nextPaymentDate: "2027-01-02T00:00:00.000Z",
    };
    expect(repeatRuleFor(inJanuaryEarly, 7, 9, 0)).toEqual({
      unit: "yearly",
      month: 11,
      day: 26,
      hour: 9,
      minute: 0,
    });
  });

  test("29 February is refused for a yearly subscription", () => {
    const leapDay = {
      ...monthlyOnThe14th,
      period: SubscriptionPeriod.YEAR,
      nextPaymentDate: "2028-02-29T00:00:00.000Z",
    };
    expect(repeatRuleFor(leapDay, 0, 9, 0)).toBeNull();
  });

  test("an unparseable payment date earns no rule", () => {
    expect(
      repeatRuleFor(
        { ...monthlyOnThe14th, nextPaymentDate: "nonsense" },
        1,
        9,
        0,
      ),
    ).toBeNull();
  });
});
