import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import type { SubscriptionRecord } from "../src";
import { buildCalendarMonth, buildMonthlySummary } from "../src";
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
