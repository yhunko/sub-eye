import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import type { SubscriptionRecord } from "../src";
import {
  buildCalendarMonth,
  buildCalendarYear,
  buildMonthlySummary,
} from "../src";
import { NOW, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

const portsFor = (subscriptions: SubscriptionRecord[]) =>
  inMemoryPorts({
    now: NOW,
    subscriptions,
    preferences: { preferredCurrency: "usd", preferredTimezone: "UTC" },
  });

const daysIn = (month: Awaited<ReturnType<typeof buildCalendarMonth>>) =>
  month.days.map((day) => day.date.slice(0, 10));

describe("buildCalendarMonth", () => {
  it("opens a day for EVERY occurrence a weekly sub has in the month, not just its nextPaymentDate", async () => {
    // The whole reason this use-case exists. Reading `nextPaymentDate` gives one
    // day; the other three tiles would be drawn from nothing, or — worse — never
    // drawn at all while the month total counted all four.
    const month = await buildCalendarMonth(
      portsFor([
        subscriptionRecord({
          id: "weekly",
          cost: "5.00",
          every: 1,
          period: SubscriptionPeriod.WEEK,
          paymentDate: "2026-08-03T00:00:00.000Z",
        }),
      ]),
      "2026-08-01T00:00:00.000Z",
    );

    expect(daysIn(month)).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
    expect(month.monthTotal).toBe(25);
  });

  it("agrees with buildMonthlySummary on the current month's total", async () => {
    // Two screens, one month, one number. They diverge the moment either side
    // pre-filters the subscription list, which is the documented call-site trap
    // in @subeye/spend — hence a mix of statuses here rather than one active row.
    const ports = portsFor([
      subscriptionRecord({ id: "plain", cost: "10.00" }),
      subscriptionRecord({
        id: "weekly",
        cost: "3.00",
        every: 1,
        period: SubscriptionPeriod.WEEK,
        paymentDate: "2026-08-04T00:00:00.000Z",
      }),
      subscriptionRecord({
        id: "lapsing",
        cost: "20.00",
        status: "cancelling",
        paymentDate: "2026-08-06T00:00:00.000Z",
        willBeCancelledAt: "2026-08-20T00:00:00.000Z",
      }),
      subscriptionRecord({
        id: "resting",
        cost: "40.00",
        status: "paused",
        paymentDate: "2026-08-09T00:00:00.000Z",
        pausedAt: "2026-08-01T00:00:00.000Z",
        resumeAt: "2026-08-25T00:00:00.000Z",
      }),
    ]);

    const [month, summary] = await Promise.all([
      buildCalendarMonth(ports),
      buildMonthlySummary(ports),
    ]);

    expect(month.monthTotal).toBe(summary.currentMonthTotal);
    expect(month.currencyCode).toBe(summary.currencyCode);
  });

  it("shows a resume on its day without charging for it", async () => {
    // A resume is a heads-up: the pause already swallowed that charge. Counting
    // it would put money on the tile that never leaves the account, and would
    // break the agreement asserted above.
    const month = await buildCalendarMonth(
      portsFor([
        subscriptionRecord({
          id: "resting",
          cost: "40.00",
          status: "paused",
          paymentDate: "2026-08-09T00:00:00.000Z",
          pausedAt: "2026-08-01T00:00:00.000Z",
          resumeAt: "2026-08-25T00:00:00.000Z",
        }),
      ]),
      "2026-08-01T00:00:00.000Z",
    );

    const resumeDay = month.days.find(
      (day) => day.date.slice(0, 10) === "2026-08-25",
    );

    expect(resumeDay?.events.map((event) => event.kind)).toContain("resumes");
    expect(resumeDay?.total).toBe(0);
  });

  it("keeps a past month's charges after the subscription has been cancelled", async () => {
    // Pre-filtering to "currently active" is the tempting shortcut and it empties
    // history: this sub was charged in June and stopped in July.
    const month = await buildCalendarMonth(
      portsFor([
        subscriptionRecord({
          id: "gone",
          cost: "10.00",
          status: "cancelled",
          paymentDate: "2026-06-05T00:00:00.000Z",
          willBeCancelledAt: "2026-07-05T00:00:00.000Z",
        }),
      ]),
      "2026-06-01T00:00:00.000Z",
    );

    expect(daysIn(month)).toEqual(["2026-06-05"]);
    expect(month.monthTotal).toBe(10);
  });

  it("groups two events on one day into a single day entry, ranked", async () => {
    const month = await buildCalendarMonth(
      portsFor([
        subscriptionRecord({
          id: "a",
          cost: "10.00",
          paymentDate: "2026-08-12T00:00:00.000Z",
        }),
        subscriptionRecord({
          id: "b",
          cost: "30.00",
          paymentDate: "2026-08-12T00:00:00.000Z",
        }),
      ]),
      "2026-08-01T00:00:00.000Z",
    );

    const day = month.days.find(
      (entry) => entry.date.slice(0, 10) === "2026-08-12",
    );

    expect(day?.events).toHaveLength(2);
    // Same rank, so the larger charge leads.
    expect(day?.events.map((event) => event.amount)).toEqual([30, 10]);
    expect(day?.total).toBe(40);
  });
});

describe("buildCalendarMonth previousMonthTotal", () => {
  it("carries the month BEFORE the one asked for, not the one before today", async () => {
    // The trap this exists for: `analyticsContext` hands back `today`, and
    // shifting from there instead of from `monthStart` prints July's delta on
    // every month the user pages to.
    const month = await buildCalendarMonth(
      portsFor([
        subscriptionRecord({
          id: "monthly",
          cost: "10.00",
          paymentDate: "2026-01-05T00:00:00.000Z",
        }),
        subscriptionRecord({
          id: "extra",
          cost: "90.00",
          // One charge, in April only — so March and April differ and a delta
          // computed off the wrong month cannot pass by coincidence.
          paymentDate: "2026-04-11T00:00:00.000Z",
          status: "cancelling",
          willBeCancelledAt: "2026-04-30T00:00:00.000Z",
        }),
      ]),
      "2026-05-01T00:00:00.000Z",
    );

    expect(month.monthTotal).toBe(10);
    expect(month.previousMonthTotal).toBe(100);
  });

  it("agrees with the month total the previous month reports for itself", async () => {
    // Two ways to the same number. They diverge the moment one side is derived
    // from occurrences and the other from a range sum over a different list.
    const ports = portsFor([
      subscriptionRecord({
        id: "weekly",
        cost: "3.00",
        every: 1,
        period: SubscriptionPeriod.WEEK,
        paymentDate: "2026-07-02T00:00:00.000Z",
      }),
      subscriptionRecord({ id: "plain", cost: "10.00" }),
    ]);

    const [july, august] = await Promise.all([
      buildCalendarMonth(ports, "2026-07-01T00:00:00.000Z"),
      buildCalendarMonth(ports, "2026-08-01T00:00:00.000Z"),
    ]);

    expect(august.previousMonthTotal).toBe(july.monthTotal);
  });

  it("reports zero for the month before the first charge rather than omitting it", async () => {
    // A client renders "no comparison" off the zero. Leaving the field undefined
    // would make an untouched month print a 100% drop.
    const month = await buildCalendarMonth(
      portsFor([
        subscriptionRecord({
          id: "new",
          cost: "10.00",
          paymentDate: "2026-08-05T00:00:00.000Z",
        }),
      ]),
      "2026-08-01T00:00:00.000Z",
    );

    expect(month.previousMonthTotal).toBe(0);
  });
});

describe("buildCalendarYear", () => {
  it("always returns twelve months, January first, however empty the year", async () => {
    // The grid it feeds is twelve boxes. A month dropped for holding nothing is
    // a hole in that grid, and it shifts every month after it.
    const year = await buildCalendarYear(
      portsFor([]),
      "2026-06-15T00:00:00.000Z",
    );

    expect(year.months).toHaveLength(12);
    expect(year.months[0]?.month).toBe("2026-01-01T00:00:00.000Z");
    expect(year.months[11]?.month).toBe("2026-12-01T00:00:00.000Z");
    expect(year.total).toBe(0);
    expect(year.heaviestDayTotal).toBe(0);
  });

  it("gives every month its OWN day count, so February is not padded to 31", async () => {
    const year = await buildCalendarYear(
      portsFor([]),
      "2026-01-01T00:00:00.000Z",
    );

    expect(year.months.map((month) => month.dayTotals.length)).toEqual([
      31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ]);
  });

  it("indexes a day's charge by day-of-month, zero-based", async () => {
    // Off-by-one here paints the heatmap one cell left of the truth for the
    // whole year, which looks plausible and is wrong everywhere.
    const year = await buildCalendarYear(
      portsFor([
        subscriptionRecord({
          id: "annual",
          cost: "50.00",
          every: 1,
          period: SubscriptionPeriod.YEAR,
          paymentDate: "2026-03-17T00:00:00.000Z",
        }),
      ]),
      "2026-01-01T00:00:00.000Z",
    );

    const march = year.months[2];
    expect(march?.dayTotals[16]).toBe(50);
    expect(march?.dayTotals[15]).toBe(0);
    expect(march?.total).toBe(50);
    expect(year.total).toBe(50);
  });

  it("sums two subscriptions landing on one day into that day's cell", async () => {
    const year = await buildCalendarYear(
      portsFor([
        subscriptionRecord({
          id: "a",
          cost: "10.00",
          paymentDate: "2026-02-03T00:00:00.000Z",
        }),
        subscriptionRecord({
          id: "b",
          cost: "5.00",
          paymentDate: "2026-02-03T00:00:00.000Z",
        }),
      ]),
      "2026-01-01T00:00:00.000Z",
    );

    expect(year.months[1]?.dayTotals[2]).toBe(15);
    expect(year.heaviestDayTotal).toBe(15);
  });

  it("counts a weekly subscription on every week it charges, all year", async () => {
    const year = await buildCalendarYear(
      portsFor([
        subscriptionRecord({
          id: "weekly",
          cost: "2.00",
          every: 1,
          period: SubscriptionPeriod.WEEK,
          paymentDate: "2026-01-01T00:00:00.000Z",
        }),
      ]),
      "2026-01-01T00:00:00.000Z",
    );

    // 2026 holds 53 Thursdays counting from 1 January.
    expect(year.total).toBe(106);
    expect(year.heaviestDayTotal).toBe(2);
  });

  it("agrees with buildCalendarMonth on any month it covers", async () => {
    // The year takes one walk over twelve months and the month takes twelve
    // walks over one. They must not be two different answers.
    const ports = portsFor([
      subscriptionRecord({
        id: "weekly",
        cost: "3.00",
        every: 1,
        period: SubscriptionPeriod.WEEK,
        paymentDate: "2026-08-04T00:00:00.000Z",
      }),
      subscriptionRecord({ id: "plain", cost: "10.00" }),
      subscriptionRecord({
        id: "resting",
        cost: "40.00",
        status: "paused",
        paymentDate: "2026-08-09T00:00:00.000Z",
        pausedAt: "2026-08-01T00:00:00.000Z",
        resumeAt: "2026-08-25T00:00:00.000Z",
      }),
    ]);

    const [year, august] = await Promise.all([
      buildCalendarYear(ports, "2026-01-01T00:00:00.000Z"),
      buildCalendarMonth(ports, "2026-08-01T00:00:00.000Z"),
    ]);

    expect(year.months[7]?.total).toBe(august.monthTotal);
  });

  it("excludes dated notices, which move no money", async () => {
    // A resume opens a day in the month view and must NOT shade a heatmap cell:
    // the pause already swallowed that charge.
    const year = await buildCalendarYear(
      portsFor([
        subscriptionRecord({
          id: "resting",
          cost: "40.00",
          status: "paused",
          paymentDate: "2026-08-09T00:00:00.000Z",
          pausedAt: "2026-08-01T00:00:00.000Z",
          resumeAt: "2026-08-25T00:00:00.000Z",
        }),
      ]),
      "2026-01-01T00:00:00.000Z",
    );

    expect(year.months[7]?.dayTotals[24]).toBe(0);
  });
});
