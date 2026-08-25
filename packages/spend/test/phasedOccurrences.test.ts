import { describe, expect, it } from "bun:test";
import {
  type PricePhaseDto,
  type SubscriptionDto,
  SubscriptionPeriod,
} from "@subeye/model";
import { AnalyticsCalculator } from "../src/analyticsCalculator";

const money = (amount: number) => ({
  original: { currencyCode: "uah", monthly: amount },
  preferred: {
    currencyCode: "uah",
    amount,
    monthly: amount,
    yearly: amount * 12,
    exchangeRate: 1,
  },
});

const phase = (
  kind: PricePhaseDto["kind"],
  amount: number,
  startsAt: string,
  endsAt: string | null,
): PricePhaseDto => ({
  id: `${kind}_${startsAt}`,
  kind,
  cost: amount,
  currency: "uah",
  startsAt,
  endsAt,
  isActive: false,
  billing: money(amount),
});

/**
 * The promo shape this whole thing exists for: 199 today, 99 for three charges
 * from the next one, 199 again after that. Two transitions sit in front of
 * `now`, which is exactly what a single "upcoming phase" cannot describe.
 */
const boltPlus = (pricePhases: PricePhaseDto[]): SubscriptionDto => ({
  id: "sub_bolt",
  name: "Bolt+",
  cost: 199,
  currency: "uah",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  paymentDate: "2026-09-25T00:00:00.000Z",
  autoPaid: true,
  categoryId: null,
  notes: null,
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-08-25T00:00:00.000Z",
  brandDomain: "bolt.eu",
  billing: money(199),
  nextPaymentDate: "2026-09-25T00:00:00.000Z",
  lastPaymentDate: null,
  willBeCancelledAt: null,
  // What `buildPhaseProjection` reports: the NEXT phase only.
  scheduledPriceChange: {
    cost: 99,
    currency: "uah",
    effectiveAt: "2026-09-25T00:00:00.000Z",
    billing: money(99),
  },
  pricePhases,
  effectivePhaseKind: "standard",
  upcomingPhase: pricePhases[0] ?? null,
  pausedAt: null,
  resumeAt: null,
  allowedActions: [],
  category: null,
  status: "active",
});

const DEFERRED_INTRO = [
  phase("intro", 99, "2026-09-25T00:00:00.000Z", "2026-12-25T00:00:00.000Z"),
  phase("standard", 199, "2026-12-25T00:00:00.000Z", null),
];

describe("resolveOccurrenceAmount", () => {
  const subscription = boltPlus(DEFERRED_INTRO);
  const at = (iso: string) =>
    AnalyticsCalculator.resolveOccurrenceAmount(subscription, new Date(iso));

  // Before the offer opens the row's own price still stands — a deferred offer
  // does not discount the period already paid for.
  it("charges the standard price before the window opens", () => {
    expect(at("2026-08-25T00:00:00.000Z")).toBe(199);
  });

  it("charges the promo price on every charge inside the window", () => {
    expect(at("2026-09-25T00:00:00.000Z")).toBe(99);
    expect(at("2026-10-25T00:00:00.000Z")).toBe(99);
    expect(at("2026-11-25T00:00:00.000Z")).toBe(99);
  });

  // THE REGRESSION. Pricing off `scheduledPriceChange` alone — the next phase —
  // returned 99 here and for every charge after it, because nothing downstream
  // of the first transition was ever consulted. A three-month promo silently
  // became a permanent one.
  it("reverts on the charge the window closes on, and stays reverted", () => {
    expect(at("2026-12-25T00:00:00.000Z")).toBe(199);
    expect(at("2027-06-25T00:00:00.000Z")).toBe(199);
  });

  it("falls back to the row price when there are no phases", () => {
    const bare = boltPlus([]);

    expect(
      AnalyticsCalculator.resolveOccurrenceAmount(
        bare,
        new Date("2026-10-25T00:00:00.000Z"),
      ),
    ).toBe(199);
  });
});

describe("collectPaymentsInRange over a phased timeline", () => {
  // A year of Bolt+ from the day the offer was taken: three charges at 99 and
  // nine at 199, not twelve of either.
  it("prices each occurrence from the phase that owns it", () => {
    const payments = AnalyticsCalculator.collectPaymentsInRange(
      [boltPlus(DEFERRED_INTRO)],
      new Date("2026-09-01T00:00:00.000Z"),
      new Date("2027-08-31T00:00:00.000Z"),
    );

    expect(payments).toHaveLength(12);
    expect(payments.filter((payment) => payment.amount === 99)).toHaveLength(3);
    expect(payments.reduce((sum, payment) => sum + payment.amount, 0)).toBe(
      3 * 99 + 9 * 199,
    );
  });
});
