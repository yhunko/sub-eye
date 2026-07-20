import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import { SubscriptionCategoryNotFoundError } from "../src/domains/subscription/subscriptionErrors";
import { SubscriptionService } from "../src/domains/subscription/subscriptionService";

const addPayload = {
  name: "Netflix",
  cost: 15,
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  paymentDate: "2026-03-01T00:00:00.000Z",
  autoPaid: true,
  categoryId: "cat_foreign",
  notes: null,
  brandDomain: "netflix.com",
  willBeCancelledAt: null,
};

describe("SubscriptionService category ownership validation", () => {
  it("rejects add when category belongs to another user", async () => {
    await expect(
      SubscriptionService.addSubscription("user_1", addPayload, null, {
        repository: {} as never,
        currencyService: {} as never,
        workflow: {} as never,
        phaseRepository: {} as never,
        phaseWorkflow: {} as never,
        userService: {} as never,
        orgService: {} as never,
        historyService: {} as never,
        categoryRepository: {
          findById: async () => ({
            id: "cat_foreign",
            userId: "user_2",
            orgId: null,
          }),
        } as never,
      }),
    ).rejects.toBeInstanceOf(SubscriptionCategoryNotFoundError);
  });

  it("rejects update when category is missing", async () => {
    await expect(
      SubscriptionService.updateSubscription(
        "sub_1",
        "user_1",
        { categoryId: "cat_missing" },
        {},
        {
          repository: {
            findById: async () => ({
              id: "sub_1",
              userId: "user_1",
              orgId: null,
            }),
          } as never,
          currencyService: {} as never,
          workflow: {} as never,
          phaseRepository: {} as never,
          phaseWorkflow: {} as never,
          userService: {} as never,
          orgService: {} as never,
          historyService: {} as never,
          categoryRepository: {
            findById: async () => null,
          } as never,
        },
      ),
    ).rejects.toBeInstanceOf(SubscriptionCategoryNotFoundError);
  });
});
