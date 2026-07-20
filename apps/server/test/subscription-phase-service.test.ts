import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
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
  qstashMessageId: null,
  cancellationQstashMessageId: null,
  priceChangeQstashMessageId: null,
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
  const scheduleCalls: Call[] = [];
  const historyCalls: Call[] = [];

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
          qstashMessageId: row.qstashMessageId ?? null,
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
    phaseWorkflow: {
      schedule: async (payload: unknown) => {
        scheduleCalls.push({ args: [payload] });
        return "run_phase";
      },
      cancel: async () => {},
    },
    historyService: {
      logAction: async (...args: unknown[]) => {
        historyCalls.push({ args });
      },
    },
  };

  return { deps, updateCalls, insertManyCalls, scheduleCalls, historyCalls };
}

describe("SubscriptionPhaseService.startTrial", () => {
  it("sets the trial price now, lays down two phases, and schedules one boundary", async () => {
    const { deps, updateCalls, insertManyCalls, scheduleCalls, historyCalls } =
      buildDeps();

    const endsAt = new Date(Date.now() + 60 * 86_400_000).toISOString();

    await SubscriptionPhaseService.startTrial(
      "sub_1",
      "user_1",
      {
        trialCost: 0,
        endsAt,
        standardCost: 12,
      },
      deps as never,
    );

    // Subscription row cost is set to the trial price immediately.
    const priceUpdate = updateCalls.find(
      (call) => (call.args[1] as { cost?: string }).cost === "0.00",
    );
    expect(priceUpdate).toBeDefined();
    expect((priceUpdate?.args[1] as { currency?: string }).currency).toBe(
      "usd",
    );

    // Two phases inserted: the trial (applied now) + the standard revert.
    expect(insertManyCalls).toHaveLength(1);
    const rows = insertManyCalls[0]?.args[0] as Array<{
      kind: string;
      cost: string;
      appliedAt: string | null;
    }>;
    expect(rows).toHaveLength(2);
    expect(rows[0]?.kind).toBe("trial");
    expect(rows[0]?.cost).toBe("0.00");
    expect(rows[0]?.appliedAt).not.toBeNull();
    expect(rows[1]?.kind).toBe("standard");
    expect(rows[1]?.cost).toBe("12.00");
    expect(rows[1]?.appliedAt).toBeNull();

    // Exactly one boundary workflow scheduled (the trial → standard transition).
    expect(scheduleCalls).toHaveLength(1);

    // History logs the change with the trial-started discriminator.
    const trialHistory = historyCalls.find(
      (call) =>
        (call.args[3] as { change?: { type?: string } })?.change?.type ===
        "trialStarted",
    );
    expect(trialHistory).toBeDefined();
    expect(trialHistory?.args[2]).toBe("updated");
  });
});
