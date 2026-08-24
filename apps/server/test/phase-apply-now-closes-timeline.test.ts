import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { SubscriptionPhaseService } from "../src/domains/subscription/subscriptionPhaseService";

const now = Date.now();
const trialEndsAt = new Date(now + 30 * 86_400_000).toISOString();

const subscription = {
  id: "sub_1",
  userId: "user_1",
  name: "Netflix",
  cost: "0.00",
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  autoPaid: true,
  categoryId: null,
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  brandDomain: null,
  paymentDate: "2026-07-01T00:00:00.000Z",
  willBeCancelledAt: null,
  status: "active" as const,
  pausedAt: null,
  resumeAt: null,
};

// The user is mid-trial: the trial phase is active until trialEndsAt, and the
// standard phase is pending, due to start exactly when the trial ends.
const trialPhase = {
  id: "phase_trial",
  subscriptionId: "sub_1",
  userId: "user_1",
  kind: "trial" as const,
  cost: "0.00",
  currency: "usd",
  startsAt: new Date(now - 5 * 86_400_000).toISOString(),
  endsAt: trialEndsAt,
  appliedAt: new Date(now - 5 * 86_400_000).toISOString(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const standardPhase = {
  id: "phase_standard",
  subscriptionId: "sub_1",
  userId: "user_1",
  kind: "standard" as const,
  cost: "12.00",
  currency: "usd",
  startsAt: trialEndsAt,
  endsAt: null,
  appliedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const preferences = {
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  locale: "en",
  notificationOffset: 0,
  notificationTime: "10:00",
};

describe("SubscriptionPhaseService.applyPhaseNow", () => {
  it("closes the trial at the apply moment and moves the standard phase start to now", async () => {
    let batchArgs: Record<string, unknown> | null = null;

    const deps = {
      repository: {
        findById: async () => ({ ...subscription }),
        update: async () => ({ ...subscription }),
      },
      phaseRepository: {
        findById: async () => ({ ...standardPhase }),
        findBySubscriptionId: async () => [trialPhase, standardPhase],
        applyBoundaryBatch: async (args: Record<string, unknown>) => {
          batchArgs = args;
        },
      },
      currencyService: { getRates: async () => ({}) },
      userService: { getUserPreferences: async () => preferences },
    };

    await SubscriptionPhaseService.applyPhaseNow(
      "sub_1",
      "user_1",
      "phase_standard",
      deps as never,
    );

    expect(batchArgs).not.toBeNull();
    const args = batchArgs as unknown as {
      appliedAt: string;
      startsAt: string;
      precedingPhaseId: string | null;
    };

    // The applied phase must start NOW, not a month from now — otherwise
    // getUpcomingPhase keeps reporting it and scheduledPriceChange stays set.
    expect(args.startsAt).toBe(args.appliedAt);
    expect(Date.parse(args.startsAt)).toBeLessThan(Date.parse(trialEndsAt));

    // The trial must be closed at the same moment — otherwise
    // getEffectivePhase keeps returning the trial and effectivePhaseKind lies.
    expect(args.precedingPhaseId).toBe("phase_trial");
  });
});
