import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { PaddleBillingService } from "../src/domains/billing/paddle/paddleBillingService";
import type {
  PaddlePrice,
  PaddleWebhookEvent,
} from "../src/domains/billing/paddle/paddleTypes";

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

const originalPlusProductId = process.env.PADDLE_PLUS_PRODUCT_ID;

const resetPlusPriceCache = () => {
  (
    PaddleBillingService as unknown as { plusPriceCache: unknown }
  ).plusPriceCache = null;
};

const createCheckoutDeps = (prices: PaddlePrice[]) => {
  let capturedPriceId: string | null = null;
  let capturedCustomerId: string | null = null;
  let billingAccount: {
    userId: string;
    paddleCustomerId: string | null;
    paddleSubscriptionId: null;
    paddleSubscriptionStatus: null;
    paddlePriceId: string | null;
    paddleCurrentPeriodEnd: null;
    lastEventOccurredAt: null;
    createdAt: Date;
    updatedAt: Date;
  } | null = {
    userId: "user_01",
    paddleCustomerId: "ctm_01",
    paddleSubscriptionId: null,
    paddleSubscriptionStatus: null,
    paddlePriceId: null,
    paddleCurrentPeriodEnd: null,
    lastEventOccurredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    deps: {
      apiClient: {
        listActivePrices: async () => prices,
        createTransaction: async (input: {
          customerId?: string;
          priceId: string;
        }) => {
          capturedCustomerId = input.customerId ?? null;
          capturedPriceId = input.priceId;
          return { id: "txn_01" };
        },
      },
      billingWebhookEventRepository: {} as never,
      billingAccountRepository: {
        findByUserId: async () => billingAccount,
        upsertByUserId: async () => ({
          userId: "user_01",
          paddleCustomerId: capturedCustomerId,
          paddleSubscriptionId: null,
          paddleSubscriptionStatus: null,
          paddlePriceId: capturedPriceId,
          paddleCurrentPeriodEnd: null,
          lastEventOccurredAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      userService: {} as never,
    } as never,
    getCapturedPriceId: () => capturedPriceId,
    getCapturedCustomerId: () => capturedCustomerId,
    setBillingAccount: (nextBillingAccount: typeof billingAccount) => {
      billingAccount = nextBillingAccount;
    },
  };
};

describe("PaddleBillingService.createCheckoutTransaction", () => {
  beforeEach(() => {
    delete process.env.PADDLE_PLUS_PRODUCT_ID;
    resetPlusPriceCache();
  });

  afterEach(() => {
    if (originalPlusProductId) {
      process.env.PADDLE_PLUS_PRODUCT_ID = originalPlusProductId;
      return;
    }

    delete process.env.PADDLE_PLUS_PRODUCT_ID;
  });

  it("throws when PADDLE_PLUS_PRODUCT_ID is missing", async () => {
    const { deps } = createCheckoutDeps([]);

    await expect(
      PaddleBillingService.createCheckoutTransaction("user_01", deps),
    ).rejects.toThrow("PADDLE_PLUS_PRODUCT_ID is required");
  });

  it("uses configured product ID to select an active recurring price", async () => {
    process.env.PADDLE_PLUS_PRODUCT_ID = "pro_plus";

    const { deps, getCapturedPriceId } = createCheckoutDeps([
      {
        id: "pri_other_month",
        productId: "pro_other",
        billingCycle: { interval: "month" },
      },
      {
        id: "pri_plus_year",
        productId: "pro_plus",
        billingCycle: { interval: "year" },
      },
    ]);

    await PaddleBillingService.createCheckoutTransaction("user_01", deps);

    expect(getCapturedPriceId()).toBe("pri_plus_year");
  });

  it("prefers monthly recurring price when multiple recurring prices exist", async () => {
    process.env.PADDLE_PLUS_PRODUCT_ID = "pro_plus";

    const { deps, getCapturedPriceId } = createCheckoutDeps([
      {
        id: "pri_plus_year",
        productId: "pro_plus",
        billingCycle: { interval: "year" },
      },
      {
        id: "pri_plus_month",
        productId: "pro_plus",
        billingCycle: { interval: "month" },
      },
    ]);

    await PaddleBillingService.createCheckoutTransaction("user_01", deps);

    expect(getCapturedPriceId()).toBe("pri_plus_month");
  });

  it("creates a checkout transaction without a Paddle customer for users without one", async () => {
    process.env.PADDLE_PLUS_PRODUCT_ID = "pro_plus";

    const { deps, getCapturedCustomerId, setBillingAccount } =
      createCheckoutDeps([
        {
          id: "pri_plus_month",
          productId: "pro_plus",
          billingCycle: { interval: "month" },
        },
      ]);

    setBillingAccount(null);

    await PaddleBillingService.createCheckoutTransaction("user_01", deps);

    expect(getCapturedCustomerId()).toBeNull();
  });
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
