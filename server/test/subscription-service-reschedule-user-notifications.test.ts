import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "shared";
import type { SubscriptionRecord } from "../src/domains/subscription/subscriptionRepository";
import { SubscriptionSchedulingService } from "../src/domains/subscription/subscriptionSchedulingService";

describe("SubscriptionSchedulingService.rescheduleUserNotifications", () => {
  it("serializes concurrent calls for the same user", async () => {
    const userId = "user_1";

    let currentQstashMessageId = "old";
    let findCalls = 0;
    const cancelCalls: string[] = [];
    const scheduleCalls: string[] = [];

    let cancelResolve: (() => void) | null = null;
    const cancelPromise = new Promise<void>((resolve) => {
      cancelResolve = resolve;
    });
    let cancelReachedResolve: (() => void) | null = null;
    const cancelReached = new Promise<void>((resolve) => {
      cancelReachedResolve = resolve;
    });

    const baseSubscription: SubscriptionRecord = {
      id: "sub_1",
      userId,
      name: "Apple Music",
      cost: "9.99",
      scheduledCost: null,
      currency: "usd",
      scheduledCurrency: null,
      every: 1,
      period: SubscriptionPeriod.MONTH,
      autoPaid: true,
      categoryId: null,
      notes: null,
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
      qstashMessageId: currentQstashMessageId,
      cancellationQstashMessageId: null,
      priceChangeQstashMessageId: null,
      brandDomain: "apple.com",
      paymentDate: "2099-03-07T00:00:00.000Z",
      scheduledEffectiveAt: null,
      willBeCancelledAt: null,
      orgId: null,
    };

    const deps = {
      repository: {
        findByUserId: async () => {
          findCalls += 1;
          return [
            {
              ...baseSubscription,
              qstashMessageId: currentQstashMessageId,
            },
          ];
        },
        update: async (_db: unknown, _id: string, data: any) => {
          if ("qstashMessageId" in data) {
            currentQstashMessageId = data.qstashMessageId;
          }

          return {
            ...baseSubscription,
            ...data,
            qstashMessageId: data.qstashMessageId ?? currentQstashMessageId,
          };
        },
      },
      currencyService: {} as any,
      workflow: {
        cancel: async (workflowRunId: string) => {
          cancelCalls.push(workflowRunId);
          cancelReachedResolve?.();
          await cancelPromise;
        },
        schedule: async () => {
          scheduleCalls.push("new");
          return "new";
        },
      },
      cancellationWorkflow: {} as any,
      priceChangeWorkflow: {} as any,
      userService: {} as any,
      orgService: {} as any,
      historyService: {} as any,
      categoryRepository: {} as any,
    };

    const p1 = SubscriptionSchedulingService.rescheduleUserNotifications(
      userId,
      deps as any,
    );

    // Allow p1 to start and reach cancel (it will block there).
    await cancelReached;

    const p2 = SubscriptionSchedulingService.rescheduleUserNotifications(
      userId,
      deps as any,
    );

    // If the lock works, p2 should not start (no extra find/cancel calls)
    // until p1 finishes.
    expect(findCalls).toBe(1);
    expect(cancelCalls).toEqual(["old"]);

    cancelResolve?.();

    await p1;
    await p2;

    // Both runs may schedule (depending on reschedule timing), but p2 must
    // not start before p1's cancel promise resolves.
    expect(findCalls).toBeGreaterThanOrEqual(2);
    expect(cancelCalls.length).toBeGreaterThanOrEqual(1);
    expect(cancelCalls[0]).toBe("old");

    // Ensure schedule is wired (sanity check).
    expect(typeof currentQstashMessageId).toBe("string");
    expect(scheduleCalls.length).toBeGreaterThanOrEqual(1);
  });
});
