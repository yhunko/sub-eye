import { type SubscriptionDto, SubscriptionPeriod } from "@subeye/model";

/**
 * A complete SubscriptionDto for tests. Test-only, but it lives in src/ so the
 * `@/` alias and the workspace types resolve the same way they do in app code.
 *
 * It exists because SubscriptionDto has 24 required fields: every cache,
 * rollback and timeline test needs a whole one, and hand-rolling it per file is
 * how fixtures drift out of sync with the schema.
 */
export function makeSubscription(
  overrides: Partial<SubscriptionDto> = {},
): SubscriptionDto {
  return {
    id: "sub_1",
    name: "Netflix",
    cost: 100,
    currency: "uah",
    every: 1,
    period: SubscriptionPeriod.MONTH,
    paymentDate: "2026-07-01T00:00:00.000Z",
    autoPaid: true,
    categoryId: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    brandDomain: "netflix.com",
    billing: {
      original: { currencyCode: "uah", monthly: 100 },
      preferred: {
        currencyCode: "uah",
        amount: 100,
        monthly: 100,
        yearly: 1200,
        exchangeRate: 1,
      },
    },
    nextPaymentDate: "2026-08-01T00:00:00.000Z",
    lastPaymentDate: null,
    willBeCancelledAt: null,
    scheduledPriceChange: null,
    pricePhases: [],
    effectivePhaseKind: "standard",
    upcomingPhase: null,
    status: "active",
    pausedAt: null,
    resumeAt: null,
    allowedActions: [],
    category: null,
    ...overrides,
  };
}
