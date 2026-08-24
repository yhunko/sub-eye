import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { AnalyticsCalculator } from "@subeye/spend";
import type { SubscriptionRecord } from "../src";
import { buildDashboard, buildMonthlySummary, listSubscriptions } from "../src";
import { NOW, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

const portsFor = (subscriptions: SubscriptionRecord[], timezone = "UTC") =>
  inMemoryPorts({
    now: NOW,
    subscriptions,
    preferences: { preferredCurrency: "usd", preferredTimezone: timezone },
  });

describe("buildDashboard", () => {
  it("makes yearlyForecast an occurrence sum, so a sub that lapses mid-year contributes only the charges that land — not a full monthlyBurnRate * 12", async () => {
    // 'cancelling' still counts toward the run-rate ("what you are signed up
    // for per month"), but this sub lapses in ~40 days, so only the one
    // occurrence that lands before then belongs in the yearly total.
    const ports = portsFor([
      subscriptionRecord({
        id: "ending",
        status: "cancelling",
        cost: "10.00",
        paymentDate: "2026-08-19T00:00:00.000Z",
        willBeCancelledAt: "2026-10-03T00:00:00.000Z",
      }),
    ]);

    const stats = await buildDashboard(ports);

    // The run-rate still counts a cancelling subscription in full.
    expect(stats.monthlyBurnRate).toBe(10);

    // yearlyForecast is the sum of occurrences that actually land, so it is
    // strictly less than monthlyBurnRate * 12 once the sub lapses mid-year.
    // As monthlyBurnRate * 12 it was 120 exactly, which trips this bound.
    expect(stats.yearlyForecast).toBeGreaterThan(0);
    expect(stats.yearlyForecast).toBeLessThan(stats.monthlyBurnRate * 12);

    // remainingThisMonth is part of the yearly total and derives from the same
    // filtered set, so it can never exceed it.
    expect(stats.remainingThisMonth).toBeLessThanOrEqual(stats.yearlyForecast);
  });

  it("returns the resolved timezone and counts no paused sub as active", async () => {
    const paused = (id: string, resumeAt: string | null) =>
      subscriptionRecord({
        id,
        status: "paused",
        pausedAt: "2026-08-23T00:00:00.000Z",
        resumeAt,
      });

    const stats = await buildDashboard(
      portsFor(
        [
          paused("later", "2026-10-23T00:00:00.000Z"),
          paused("sooner", "2026-08-29T00:00:00.000Z"),
          paused("indefinite", null),
        ],
        "Europe/Kyiv",
      ),
    );

    // The client must stop re-deriving the timezone from the device.
    expect(stats.timezone).toBe("Europe/Kyiv");

    // A paused subscription still bills nothing. This is what Home's empty
    // state reads, so counting one here sends a paused-only account to the
    // first-run screen instead of its own numbers.
    expect(stats.activeSubscriptionsTotal).toBe(0);
    expect(stats.remainingThisMonth).toBe(0);
    expect(stats.upcomingRenewals).toEqual([]);
    expect(stats.categorySpending).toEqual([]);
  });

  it("emits exactly one upcoming renewal per subscription, soonest first", async () => {
    const stats = await buildDashboard(
      portsFor([
        subscriptionRecord({
          id: "weekly",
          period: SubscriptionPeriod.WEEK,
          paymentDate: "2026-08-18T00:00:00.000Z",
        }),
        subscriptionRecord({
          id: "monthly",
          paymentDate: "2026-07-30T00:00:00.000Z",
        }),
      ]),
    );

    // One per subscription — not 52 for the weekly one.
    expect(stats.upcomingRenewals).toHaveLength(2);
    expect(stats.upcomingRenewals[0]?.id).toBe("weekly");
    expect(stats.upcomingRenewals[1]?.id).toBe("monthly");
    expect(stats.upcomingRenewals[0]?.daysUntil).toBeLessThanOrEqual(
      stats.upcomingRenewals[1]?.daysUntil ?? 0,
    );
  });
});

describe("nextOccurrenceRenewals", () => {
  it("skips a subscription whose next occurrence falls inside its pause window", async () => {
    const [paused] = await listSubscriptions(
      portsFor([
        subscriptionRecord({
          id: "paused",
          status: "paused",
          pausedAt: "2026-08-23T00:00:00.000Z",
          resumeAt: "2026-11-22T00:00:00.000Z",
          paymentDate: "2026-07-30T00:00:00.000Z",
        }),
      ]),
    );

    const renewals = AnalyticsCalculator.nextOccurrenceRenewals(
      paused ? [paused] : [],
      NOW,
      "usd",
    );

    // The charge in ~6 days will not happen — showing it is a lie.
    expect(renewals).toEqual([]);
  });
});

describe("buildMonthlySummary", () => {
  it("returns eight months, last month first, and a null delta when nothing was spent then", async () => {
    const summary = await buildMonthlySummary(
      portsFor([
        subscriptionRecord({
          cost: "10.00",
          // Starts this month, so last month is empty.
          paymentDate: "2026-08-20T00:00:00.000Z",
        }),
      ]),
    );

    expect(summary.trend).toHaveLength(8);
    expect(summary.trend[0]?.date).toBe("2026-07-01T00:00:00.000Z");
    expect(summary.previousMonthTotal).toBe(0);

    // Null, not 0 and not Infinity: with nothing spent last month there is no
    // percentage to render, and the client shows the absence.
    expect(summary.deltaPercentage).toBeNull();
  });

  it("counts every subscription, not only the currently active ones", async () => {
    // The monthly trend is a spend history: a subscription that has since been
    // cancelled still cost money in the months before it lapsed.
    const summary = await buildMonthlySummary(
      portsFor([
        subscriptionRecord({
          id: "ended",
          status: "cancelled",
          cost: "10.00",
          paymentDate: "2026-08-10T00:00:00.000Z",
          willBeCancelledAt: "2026-08-20T00:00:00.000Z",
        }),
      ]),
    );

    expect(summary.currentMonthTotal).toBe(10);
  });
});
