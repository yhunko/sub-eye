import {
  afterAll,
  beforeAll,
  describe,
  expect,
  setSystemTime,
  test,
} from "bun:test";
import { SubscriptionPeriod, type UserPreferences } from "@subeye/model";
import type {
  EmbeddedCategory,
  PricePhaseRecord,
  SubscriptionRecord,
} from "@subeye/store";
import { toSubscriptionDto } from "@subeye/store";
import type { PricePhaseRecord as DbPricePhaseRecord } from "../src/domains/subscription/subscriptionPricePhaseRepository";
import type { SubscriptionRecord as DbSubscriptionRecord } from "../src/domains/subscription/subscriptionRepository";
import { SubscriptionService } from "../src/domains/subscription/subscriptionService";

// TEMPORARY. This file exists only while both implementations do: it pins
// @subeye/store's `toSubscriptionDto` against the server's live
// SubscriptionService.mapToDto -> SubscriptionMapper.toDto chain. The moment
// the server stops owning a mapper this test has nothing left to compare and
// should be deleted with it (Plan B).

const NOW = new Date("2026-08-24T12:00:00.000Z");

// The live mapper reads the clock three times internally — calculatePaymentDates
// defaults `relativeTo`, buildPhaseProjection defaults `now`, and
// deriveSubscriptionStatus is handed a fresh `new Date()`. Pinning the system
// clock is what lets the two DTOs be compared whole, `status` included, instead
// of field by field with exclusions.
beforeAll(() => setSystemTime(NOW));
afterAll(() => setSystemTime());

const preferences: UserPreferences = {
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  dateFormat: "DD/MM/YYYY",
  locale: "en",
  theme: "system",
};

const rates = { usd: 1, eur: 0.92, uah: 41.5 };

const category: EmbeddedCategory = {
  id: "c1",
  name: "Streaming",
  emoji: "📺",
};

const subscription: SubscriptionRecord = {
  id: "s1",
  name: "Netflix",
  cost: "15.00",
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  status: "active",
  autoPaid: true,
  categoryId: "c1",
  notes: "family plan",
  brandDomain: "netflix.com",
  paymentDate: "2026-02-06T00:00:00.000Z",
  willBeCancelledAt: null,
  pausedAt: null,
  resumeAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
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

/**
 * The conversion the server's port adapter owns. `subscriptions.cancelled_at`,
 * `created_at` and `updated_at` are Date-mode Drizzle columns while
 * `payment_date`, `paused_at` and `resume_at` are string-mode — the store is
 * uniformly ISO strings, so a record crossing back into the server's shape has
 * to grow the Dates again. Doing it here is what makes the comparison honest:
 * the live mapper sees exactly the mixed shape it sees in production.
 */
const toDbSubscription = (
  record: SubscriptionRecord,
): DbSubscriptionRecord => ({
  ...record,
  userId: "user_1",
  willBeCancelledAt: record.willBeCancelledAt
    ? new Date(record.willBeCancelledAt)
    : null,
  createdAt: new Date(record.createdAt),
  updatedAt: new Date(record.updatedAt),
});

const toDbPhase = (record: PricePhaseRecord): DbPricePhaseRecord => ({
  ...record,
  userId: "user_1",
  createdAt: new Date(record.createdAt),
  updatedAt: new Date(record.updatedAt),
});

const expectParity = (args: {
  subscription: SubscriptionRecord;
  phases?: PricePhaseRecord[];
  preferences?: UserPreferences;
  rates?: Record<string, number>;
  category?: EmbeddedCategory | null;
}) => {
  const phases = args.phases ?? [];
  const prefs = args.preferences ?? preferences;
  const rateTable = args.rates ?? rates;
  const embedded = args.category === undefined ? category : args.category;

  const ported = toSubscriptionDto(
    args.subscription,
    phases,
    prefs,
    rateTable,
    embedded,
    NOW,
  );
  const live = SubscriptionService.mapToDto(
    toDbSubscription(args.subscription),
    prefs,
    rateTable,
    phases.map(toDbPhase),
    embedded,
  );

  expect(ported).toEqual(live);
  return ported;
};

describe("toSubscriptionDto matches the live mapper", () => {
  test("a plain active subscription", () => {
    const dto = expectParity({ subscription });

    expect(dto.status).toBe("active");
  });

  test("a cancelling subscription", () => {
    const dto = expectParity({
      subscription: {
        ...subscription,
        status: "cancelling",
        willBeCancelledAt: "2026-09-30T00:00:00.000Z",
      },
    });

    expect(dto.status).toBe("cancelling");
  });

  test("a paused subscription with no resume date", () => {
    const dto = expectParity({
      subscription: {
        ...subscription,
        status: "paused",
        pausedAt: "2026-08-01T10:00:00.000Z",
        resumeAt: null,
      },
    });

    expect(dto.status).toBe("paused");
  });

  test("a pending phase", () => {
    const dto = expectParity({ subscription, phases: [phase] });

    expect(dto.upcomingPhase?.id).toBe("p1");
    expect(dto.effectivePhaseKind).toBe("standard");
  });

  test("an active trial phase", () => {
    const dto = expectParity({
      subscription: { ...subscription, cost: "0.00" },
      phases: [
        {
          ...phase,
          id: "p2",
          kind: "trial",
          cost: "0.00",
          startsAt: "2026-08-01T00:00:00.000Z",
          endsAt: "2026-09-01T00:00:00.000Z",
          appliedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    expect(dto.effectivePhaseKind).toBe("trial");
  });

  test("a currency with no entry in the rate table", () => {
    const dto = expectParity({
      subscription: { ...subscription, currency: "sek" },
      rates: { usd: 1, eur: 0.92 },
    });

    // A missing rate degrades to 1:1 rather than throwing; the parity that
    // matters is that both sides degrade the same way.
    expect(dto.billing.preferred.amount).toBe(15);
    expect(dto.billing.preferred.exchangeRate).toBe(1);
  });

  // The timezone is the one argument a port can silently drop: `undefined`
  // still produces a plausible DTO, just one whose day boundaries are the
  // host's. Both consumers of it are exercised here, and both need the anchor
  // dates to straddle the Auckland/UTC day boundary at `NOW` to show it —
  // `deriveSubscriptionStatus` (cancelled today, not cancelling) and
  // `calculatePaymentDates` (a charge falling today is next, not last).
  test("a non-UTC preferred timezone", () => {
    const dto = expectParity({
      subscription: {
        ...subscription,
        status: "cancelling",
        paymentDate: "2026-02-24T00:00:00.000Z",
        willBeCancelledAt: "2026-08-25T00:00:00.000Z",
      },
      preferences: { ...preferences, preferredTimezone: "Pacific/Auckland" },
    });

    expect(dto.status).toBe("cancelled");
    expect(dto.nextPaymentDate).toBe("2026-09-24T00:00:00.000Z");
    expect(dto.lastPaymentDate).toBe("2026-08-24T00:00:00.000Z");
  });

  test("no embedded category", () => {
    const dto = expectParity({
      subscription: { ...subscription, categoryId: null },
      category: null,
    });

    expect(dto.category).toBeNull();
  });
});
