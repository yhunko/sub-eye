import { describe, expect, it } from "bun:test";
import { type SubscriptionDto, SubscriptionPeriod } from "@subeye/model";
import { AnalyticsCalculator } from "../src/analyticsCalculator";

function createSubscription({
  id,
  name,
  monthly,
}: {
  id: string;
  name: string;
  monthly: number;
}): SubscriptionDto {
  return {
    id,
    name,
    cost: monthly,
    currency: "usd",
    every: 1,
    period: SubscriptionPeriod.MONTH,
    paymentDate: "2026-01-01T00:00:00.000Z",
    autoPaid: true,
    categoryId: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    brandDomain: `${id}.example`,
    billing: {
      original: { currencyCode: "usd", monthly },
      preferred: {
        currencyCode: "usd",
        amount: monthly,
        monthly,
        yearly: monthly * 12,
        exchangeRate: 1,
      },
    },
    nextPaymentDate: "2026-02-01T00:00:00.000Z",
    lastPaymentDate: null,
    willBeCancelledAt: null,
    scheduledPriceChange: null,
    pricePhases: [],
    effectivePhaseKind: "standard",
    upcomingPhase: null,
    pausedAt: null,
    resumeAt: null,
    allowedActions: [],
    category: null,
    status: "active",
  };
}

describe("AnalyticsCalculator.findMostExpensive", () => {
  // Home's month card links the figure it prints to a detail page. An id copied
  // from the wrong iteration opens someone else's subscription while showing the
  // right amount, which nothing on screen would contradict — so the id and the
  // amount are asserted as one fact, off a list whose priciest is not first.
  it("names the subscription the amount belongs to", () => {
    const best = AnalyticsCalculator.findMostExpensive([
      createSubscription({ id: "sub_cheap", name: "Cheap", monthly: 4 }),
      createSubscription({ id: "sub_dear", name: "Dear", monthly: 40 }),
      createSubscription({ id: "sub_middle", name: "Middle", monthly: 12 }),
    ]);

    expect(best).toEqual({
      id: "sub_dear",
      name: "Dear",
      yearlyAmount: 480,
      brandDomain: "sub_dear.example",
    });
  });

  it("returns null when every active subscription is free", () => {
    expect(
      AnalyticsCalculator.findMostExpensive([
        createSubscription({ id: "sub_free", name: "Free", monthly: 0 }),
      ]),
    ).toBeNull();
  });
});
