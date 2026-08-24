import { expect, test } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import type {
  PreferencesRecord,
  PricePhaseRecord,
  SubscriptionRecord,
} from "../src";
import { toSubscriptionDto } from "../src";

const preferences: PreferencesRecord = {
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  dateFormat: "DD/MM/YYYY",
  locale: "en",
  theme: "system",
};

const subscription: SubscriptionRecord = {
  id: "s1",
  name: "Netflix",
  cost: "15.00",
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  status: "cancelling",
  autoPaid: false,
  categoryId: null,
  notes: null,
  brandDomain: null,
  paymentDate: "2026-02-06T00:00:00.000Z",
  willBeCancelledAt: "2026-10-01T00:00:00.000Z",
  pausedAt: null,
  resumeAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const phase: PricePhaseRecord = {
  id: "p1",
  subscriptionId: "s1",
  kind: "scheduledChange",
  cost: "18.00",
  currency: "usd",
  startsAt: "2026-10-01T00:00:00.000Z",
  endsAt: null,
  appliedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// Three separate things inside the DTO assembly want a clock — the status
// derivation, the payment-date walk, and the phase projection — and each one
// has a default that silently falls back to `new Date()`. Running the same
// record through two injected instants is the only way to prove all three took
// the argument: a consumer that reached for the ambient clock would return the
// same answer twice.
test("every clock read comes from the injected `now`", () => {
  const before = toSubscriptionDto(
    subscription,
    [phase],
    preferences,
    { usd: 1 },
    null,
    new Date("2026-09-01T00:00:00.000Z"),
  );
  const after = toSubscriptionDto(
    subscription,
    [phase],
    preferences,
    { usd: 1 },
    null,
    new Date("2026-11-01T00:00:00.000Z"),
  );

  expect(before.status).toBe("cancelling");
  expect(after.status).toBe("cancelled");

  expect(before.nextPaymentDate).toBe("2026-09-06T00:00:00.000Z");
  expect(after.nextPaymentDate).toBe("2026-11-06T00:00:00.000Z");

  expect(before.effectivePhaseKind).toBe("standard");
  expect(before.upcomingPhase?.id).toBe("p1");
  expect(after.effectivePhaseKind).toBe("scheduledChange");
  expect(after.upcomingPhase).toBeNull();
});
