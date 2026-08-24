import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { SubscriptionPhaseService } from "../src/domains/subscription/subscriptionPhaseService";

const baseSubscription = {
  id: "sub_1",
  userId: "user_1",
  name: "Netflix",
  cost: "15.00",
  scheduledCost: null,
  currency: "usd",
  scheduledCurrency: null,
  every: 1,
  period: SubscriptionPeriod.MONTH,
  autoPaid: true,
  categoryId: null,
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  brandDomain: "netflix.com",
  paymentDate: "2026-07-01T00:00:00.000Z",
  scheduledEffectiveAt: null,
  willBeCancelledAt: null,
  orgId: null,
};

const preferences = {
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  locale: "en",
  notificationOffset: 0,
  notificationTime: "10:00",
};

type Call = { args: unknown[] };

function buildDeps() {
  const updateCalls: Call[] = [];
  const insertManyCalls: Call[] = [];

  const deps = {
    repository: {
      findById: async () => ({ ...baseSubscription }),
      update: async (id: string, data: unknown) => {
        updateCalls.push({ args: [id, data] });
        return { ...baseSubscription, ...(data as object) };
      },
    },
    phaseRepository: {
      findBySubscriptionId: async () => [],
      findPendingBySubscriptionId: async () => [],
      deletePendingBySubscriptionId: async () => {},
      deleteAllBySubscriptionId: async () => {},
      insertMany: async (rows: Array<Record<string, unknown>>) => {
        insertManyCalls.push({ args: [rows] });
        return rows.map((row, index) => ({
          ...row,
          id: `phase_${index}`,
          appliedAt: row.appliedAt ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      },
      update: async () => ({}),
    },
    currencyService: {
      getRates: async () => ({}),
    },
    userService: {
      getUserPreferences: async () => preferences,
    },
  };

  return { deps, updateCalls, insertManyCalls };
}

describe("SubscriptionPhaseService.startPhase", () => {
  it("routes kind=trial to the trial schedule: sets the price now and lays down two phases", async () => {
    const { deps, updateCalls, insertManyCalls } = buildDeps();

    const endsAt = new Date(Date.now() + 60 * 86_400_000).toISOString();

    await SubscriptionPhaseService.startPhase(
      "sub_1",
      "user_1",
      { kind: "trial", promoCost: 0, endsAt, standardCost: 12 },
      deps as never,
    );

    // Subscription row cost is set to the trial price immediately.
    const priceUpdate = updateCalls.find(
      (call) => (call.args[1] as { cost?: string }).cost === "0.00",
    );
    expect(priceUpdate).toBeDefined();
    expect(priceUpdate?.args[1]).toMatchObject({ currency: "usd" });

    // Two phases inserted: the trial (applied now) + the standard revert.
    expect(insertManyCalls).toHaveLength(1);
    const rows = insertManyCalls[0]?.args[0] as Array<{
      kind: string;
      cost: string;
      appliedAt: string | null;
    }>;
    expect(rows.map((row) => row.kind)).toEqual(["trial", "standard"]);
    expect(rows[0]?.cost).toBe("0.00");
    expect(rows[0]?.appliedAt).not.toBeNull();
    expect(rows[1]?.cost).toBe("12.00");
    expect(rows[1]?.appliedAt).toBeNull();
  });

  it("routes kind=intro to the intro schedule", async () => {
    const { deps, insertManyCalls } = buildDeps();
    const endsAt = new Date(Date.now() + 60 * 86_400_000).toISOString();

    await SubscriptionPhaseService.startPhase(
      "sub_1",
      "user_1",
      { kind: "intro", promoCost: 5, endsAt, standardCost: 12 },
      deps as never,
    );

    const rows = insertManyCalls[0]?.args[0] as Array<{ kind: string }>;
    expect(rows.map((row) => row.kind)).toEqual(["intro", "standard"]);
  });

  it("routes kind=scheduledChange to a single future phase", async () => {
    const { deps, insertManyCalls } = buildDeps();

    await SubscriptionPhaseService.startPhase(
      "sub_1",
      "user_1",
      { kind: "scheduledChange", cost: 20, mode: "nextOccurrence" },
      deps as never,
    );

    const rows = insertManyCalls[0]?.args[0] as Array<{
      kind: string;
      cost: string;
    }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("scheduledChange");
    expect(rows[0]?.cost).toBe("20.00");
  });
});
