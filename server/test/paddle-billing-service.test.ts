import { describe, expect, it } from "bun:test";
import { PaddleBillingService } from "../src/domains/billing/paddle/paddleBillingService";
import type { PaddleWebhookEvent } from "../src/domains/billing/paddle/paddleTypes";

const createWebhookEvent = (
  overrides: Partial<PaddleWebhookEvent> = {},
): PaddleWebhookEvent => ({
  event_id: "evt_01",
  event_type: "subscription.updated",
  occurred_at: "2026-03-03T09:00:00.000Z",
  data: {
    id: "sub_01",
    status: "active",
    customer_id: "ctm_01",
    custom_data: { userId: "user_01" },
  },
  ...overrides,
});

describe("PaddleBillingService.processWebhookEvent", () => {
  it("returns early for already processed events", async () => {
    let findByUserIdCalls = 0;
    let upsertCalls = 0;
    let setPlanCalls = 0;

    await PaddleBillingService.processWebhookEvent(createWebhookEvent(), {
      apiClient: {} as never,
      billingWebhookEventRepository: {
        markProcessed: async () => false,
      } as never,
      billingAccountRepository: {
        findByUserId: async () => {
          findByUserIdCalls += 1;
          return null;
        },
        findByPaddleCustomerId: async () => null,
        findByPaddleSubscriptionId: async () => null,
        upsertByUserId: async () => {
          upsertCalls += 1;
          return null;
        },
      } as never,
      userService: {
        setPlanId: async () => {
          setPlanCalls += 1;
        },
      } as never,
    });

    expect(findByUserIdCalls).toBe(0);
    expect(upsertCalls).toBe(0);
    expect(setPlanCalls).toBe(0);
  });

  it("ignores stale events older than the latest processed timestamp", async () => {
    let upsertCalls = 0;
    let setPlanCalls = 0;

    await PaddleBillingService.processWebhookEvent(createWebhookEvent(), {
      apiClient: {} as never,
      billingWebhookEventRepository: {
        markProcessed: async () => true,
      } as never,
      billingAccountRepository: {
        findByUserId: async () => ({
          userId: "user_01",
          paddleCustomerId: "ctm_01",
          paddleSubscriptionId: "sub_01",
          paddleSubscriptionStatus: "active",
          paddlePriceId: null,
          paddleCurrentPeriodEnd: null,
          lastEventOccurredAt: "2026-03-03T10:00:00.000Z",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findByPaddleCustomerId: async () => null,
        findByPaddleSubscriptionId: async () => null,
        upsertByUserId: async () => {
          upsertCalls += 1;
          return null;
        },
      } as never,
      userService: {
        setPlanId: async () => {
          setPlanCalls += 1;
        },
      } as never,
    });

    expect(upsertCalls).toBe(0);
    expect(setPlanCalls).toBe(0);
  });

  it("updates user plan to plus for active subscription events", async () => {
    let capturedPlanId: string | null = null;
    let upsertCalls = 0;

    await PaddleBillingService.processWebhookEvent(createWebhookEvent(), {
      apiClient: {} as never,
      billingWebhookEventRepository: {
        markProcessed: async () => true,
      } as never,
      billingAccountRepository: {
        findByUserId: async () => null,
        findByPaddleCustomerId: async () => null,
        findByPaddleSubscriptionId: async () => null,
        upsertByUserId: async () => {
          upsertCalls += 1;
          return {
            userId: "user_01",
            paddleCustomerId: "ctm_01",
            paddleSubscriptionId: "sub_01",
            paddleSubscriptionStatus: "active",
            paddlePriceId: null,
            paddleCurrentPeriodEnd: null,
            lastEventOccurredAt: "2026-03-03T09:00:00.000Z",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
      } as never,
      userService: {
        setPlanId: async (_userId, planId) => {
          capturedPlanId = planId;
        },
      } as never,
    });

    expect(upsertCalls).toBe(1);
    expect(capturedPlanId).toBe("plus");
  });
});
