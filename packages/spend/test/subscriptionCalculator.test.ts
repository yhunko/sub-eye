import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { SubscriptionCalculator } from "../src/subscriptionCalculator";

describe("SubscriptionCalculator.calculateBillingDetails", () => {
  // Proves the same-currency path: no conversion, exchangeRate is exactly 1,
  // and the yearly figure is derived as monthly * 12 (NOT from the raw amount),
  // which is what makes a yearly-billed sub comparable to a monthly one.
  it("normalizes a yearly subscription to monthly and yearly in the same currency", () => {
    const details = SubscriptionCalculator.calculateBillingDetails(
      {
        cost: "120.00",
        currency: "usd",
        every: 1,
        period: SubscriptionPeriod.YEAR,
      },
      "usd",
      {},
    );

    expect(details.original).toEqual({ currencyCode: "usd", monthly: 10 });
    expect(details.preferred.amount).toBe(120);
    expect(details.preferred.monthly).toBe(10);
    expect(details.preferred.yearly).toBe(120);
    expect(details.preferred.exchangeRate).toBe(1);
  });

  // Proves the direction of the conversion. The table says 1 USD = 41.5 UAH.
  // Converting a UAH amount INTO USD must DIVIDE by that rate. Getting this
  // backwards is the classic FX bug and would inflate every figure ~1700x.
  it("converts into the preferred currency by dividing by the rate", () => {
    const details = SubscriptionCalculator.calculateBillingDetails(
      {
        cost: "415.00",
        currency: "uah",
        every: 1,
        period: SubscriptionPeriod.MONTH,
      },
      "usd",
      { uah: 41.5 },
    );

    expect(details.preferred.amount).toBe(10);
    expect(details.preferred.monthly).toBe(10);
    expect(details.original.currencyCode).toBe("uah");
    // exchangeRate is reported as the reciprocal of the table entry.
    expect(details.preferred.exchangeRate).toBeCloseTo(1 / 41.5, 10);
  });

  // Proves the documented degradation: an unknown currency does not throw and
  // does not zero out — the amount passes through untouched at rate 1.
  it("passes the amount through unchanged when no rate is known", () => {
    const details = SubscriptionCalculator.calculateBillingDetails(
      {
        cost: "50.00",
        currency: "jpy",
        every: 1,
        period: SubscriptionPeriod.MONTH,
      },
      "usd",
      {},
    );

    expect(details.preferred.amount).toBe(50);
    expect(details.preferred.exchangeRate).toBe(1);
  });
});

describe("SubscriptionCalculator.calculatePaymentDates", () => {
  // A payment date is a CALENDAR DAY stored as its UTC midnight, so walking the
  // recurrence must not go through the account's timezone. Anchored on 6 Feb
  // (UTC+2 in Kyiv) and projected into August (UTC+3), a zoned walk preserved
  // the 02:00 wall clock and landed on 2026-08-05T23:00Z — which every reader in
  // the app prints as the 5th, one day before the charge. The user saw the app
  // say "tomorrow" while the widget said "the day after".
  it("keeps an occurrence on its UTC day across a DST change in the account timezone", () => {
    const { nextPaymentDate } = SubscriptionCalculator.calculatePaymentDates(
      {
        every: 1,
        period: SubscriptionPeriod.MONTH,
        paymentDate: "2026-02-06T00:00:00.000Z",
      },
      "Europe/Kyiv",
      new Date("2026-08-04T07:00:00.000Z"),
    );

    expect(nextPaymentDate).toBe("2026-08-06T00:00:00.000Z");
  });

  // West of UTC the comparison date is the other half of the same rule: with
  // "today" floored to an account-zone midnight (05:00Z in New York) a payment
  // due TODAY at 00:00Z read as already past, and the walk stepped a whole
  // period forward — the subscription silently skipped a month.
  it("returns today's payment for an account west of UTC", () => {
    const { nextPaymentDate } = SubscriptionCalculator.calculatePaymentDates(
      {
        every: 1,
        period: SubscriptionPeriod.MONTH,
        paymentDate: "2026-01-04T00:00:00.000Z",
      },
      "America/New_York",
      new Date("2026-08-04T14:00:00.000Z"),
    );

    expect(nextPaymentDate).toBe("2026-08-04T00:00:00.000Z");
  });

  // Proves the anchor semantics: paymentDate is the FIRST payment, not the next
  // one. From a Jan 10 anchor, viewed on Mar 15, the next payment is Apr 10 and
  // the last was Mar 10 — both derived by walking the recurrence, not stored.
  it("derives next and last payment from the anchor date", () => {
    const { nextPaymentDate, lastPaymentDate } =
      SubscriptionCalculator.calculatePaymentDates(
        {
          every: 1,
          period: SubscriptionPeriod.MONTH,
          paymentDate: "2026-01-10T00:00:00.000Z",
        },
        "UTC",
        new Date("2026-03-15T00:00:00.000Z"),
      );

    expect(nextPaymentDate.slice(0, 10)).toBe("2026-04-10");
    expect(lastPaymentDate?.slice(0, 10)).toBe("2026-03-10");
  });

  // Proves there is no "last payment" before the anchor itself — the function
  // returns null rather than inventing a payment that never happened.
  it("returns a null last payment before the anchor", () => {
    const { lastPaymentDate } = SubscriptionCalculator.calculatePaymentDates(
      {
        every: 1,
        period: SubscriptionPeriod.MONTH,
        paymentDate: "2026-06-10T00:00:00.000Z",
      },
      "UTC",
      new Date("2026-05-01T00:00:00.000Z"),
    );

    expect(lastPaymentDate).toBeNull();
  });
});
