import type {
  PricePhaseKind,
  SubscriptionPeriod,
  SubscriptionStatus,
  UserPreferences,
} from "@subeye/model";

/**
 * The stored shape of a subscription.
 *
 * Every timestamp is an ISO-8601 string, uniformly. A host's own schema will
 * not be: the server's Drizzle table hands back `paymentDate`, `pausedAt` and
 * `resumeAt` as strings but `willBeCancelledAt`, `createdAt` and `updatedAt` as
 * `Date`. Absorbing that mismatch belongs in the adapter behind the port, so
 * that nothing downstream has to ask which of the two a field is.
 *
 * `paymentDate`, `willBeCancelledAt` and `resumeAt` are CALENDAR DAYS stored as
 * that day's UTC midnight; `pausedAt`, `createdAt` and `updatedAt` are
 * INSTANTS. Never compare across the two.
 *
 * There is no `userId` on any record here, or on any other. The store is
 * single-tenant by construction — a multi-tenant host supplies the tenant in
 * its port implementation.
 */
export type SubscriptionRecord = {
  id: string;
  name: string;
  cost: string;
  currency: string;
  every: number;
  period: SubscriptionPeriod;
  status: SubscriptionStatus;
  autoPaid: boolean;
  categoryId: string | null;
  notes: string | null;
  brandDomain: string | null;
  paymentDate: string;
  willBeCancelledAt: string | null;
  pausedAt: string | null;
  resumeAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CategoryRecord = {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * One window in a subscription's price timeline. `startsAt` and `endsAt` are
 * calendar days; `appliedAt` is the instant the boundary fired and is the
 * idempotency anchor — `null` means pending.
 */
export type PricePhaseRecord = {
  id: string;
  subscriptionId: string;
  kind: PricePhaseKind;
  cost: string;
  currency: string;
  startsAt: string;
  endsAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PreferencesRecord = UserPreferences;
