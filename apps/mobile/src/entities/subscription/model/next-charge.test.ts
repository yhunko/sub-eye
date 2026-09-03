import { describe, expect, it } from "bun:test";
import {
  type PricePhaseDto,
  type SubscriptionDto,
  SubscriptionPeriod,
} from "@subeye/model";
import { nextChargeBilling } from "./next-charge";

const billing = (amount: number): SubscriptionDto["billing"] => ({
  original: { currencyCode: "usd", monthly: amount / 42 },
  preferred: {
    currencyCode: "uah",
    amount,
    monthly: amount,
    yearly: amount * 12,
    exchangeRate: 42,
  },
});

function sub(overrides: Partial<SubscriptionDto>): SubscriptionDto {
  return {
    id: "s1",
    name: "Strava",
    cost: 0,
    currency: "usd",
    every: 1,
    period: SubscriptionPeriod.MONTH,
    paymentDate: "2026-09-01T00:00:00.000Z",
    autoPaid: true,
    categoryId: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    brandDomain: null,
    billing: billing(0),
    nextPaymentDate: "2026-09-10T00:00:00.000Z",
    lastPaymentDate: null,
    willBeCancelledAt: null,
    scheduledPriceChange: null,
    pricePhases: [],
    effectivePhaseKind: "trial",
    upcomingPhase: null,
    status: "active",
    pausedAt: null,
    resumeAt: null,
    allowedActions: [],
    category: null,
    ...overrides,
  };
}

const phase = (startsAt: string, amount: number): PricePhaseDto => ({
  id: "p1",
  kind: "standard",
  cost: amount / 42,
  currency: "usd",
  startsAt,
  endsAt: null,
  isActive: false,
  billing: billing(amount),
});

describe("nextChargeBilling", () => {
  it("reads the incoming phase when a trial converts before the charge", () => {
    // The row that made this necessary: a free trial ending on the 5th, next
    // charge on the 10th. Printing today's price there says "₴0.00, in 7 days"
    // over a payment that will take ₴534.89.
    const billed = nextChargeBilling(
      sub({ upcomingPhase: phase("2026-09-05T00:00:00.000Z", 534.89) }),
    );

    expect(billed.amount).toBe(534.89);
  });

  it("keeps today's price when the phase starts after the charge", () => {
    // A rise scheduled for next month must not be printed on this month's row.
    const billed = nextChargeBilling(
      sub({
        billing: billing(311.83),
        effectivePhaseKind: "intro",
        upcomingPhase: phase("2026-09-20T00:00:00.000Z", 579.5),
      }),
    );

    expect(billed.amount).toBe(311.83);
  });

  it("counts a phase starting ON the charge date as the price charged", () => {
    // The charge is taken under whatever is effective that day, and an
    // end-of-cycle conversion lands exactly here — an exclusive test would bill
    // every one of them at the old price.
    const billed = nextChargeBilling(
      sub({ upcomingPhase: phase("2026-09-10T00:00:00.000Z", 534.89) }),
    );

    expect(billed.amount).toBe(534.89);
  });

  it("falls back to today's price with no phase ahead and on an unparseable date", () => {
    expect(nextChargeBilling(sub({ billing: billing(420) })).amount).toBe(420);
    expect(
      nextChargeBilling(
        sub({ billing: billing(420), upcomingPhase: phase("not a date", 999) }),
      ).amount,
    ).toBe(420);
  });
});
