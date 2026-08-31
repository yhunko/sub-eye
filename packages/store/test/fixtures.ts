import { SubscriptionPeriod } from "@subeye/model";
import type { PricePhaseRecord, SubscriptionRecord } from "../src";

/** The instant every test injects through `ports.now()`. */
export const NOW = new Date("2026-08-24T00:00:00.000Z");

export const subscriptionRecord = (
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord => ({
  id: "sub_1",
  name: "Netflix",
  cost: "10.00",
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  status: "active",
  autoPaid: true,
  categoryId: null,
  notes: null,
  brandDomain: null,
  // Anchored well in the past, so anything that must roll the anchor forward
  // has somewhere to roll it to.
  paymentDate: "2026-01-05T00:00:00.000Z",
  willBeCancelledAt: null,
  pausedAt: null,
  resumeAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

export const phaseRecord = (
  overrides: Partial<PricePhaseRecord> = {},
): PricePhaseRecord => ({
  id: "phase_1",
  subscriptionId: "sub_1",
  kind: "standard",
  cost: "12.00",
  currency: "usd",
  startsAt: "2026-09-24T00:00:00.000Z",
  endsAt: null,
  appliedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});
