import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import { SubscriptionService } from "../src/domains/subscription/subscriptionService";

const preferences = {
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  locale: "en",
  notificationOffset: 0,
  notificationTime: "10:00",
};

describe("SubscriptionService.addSubscription", () => {
  it("rejects an intro ending later today WITHOUT creating the subscription row", async () => {
    const created: string[] = [];

    // 23:00 today in UTC: strictly in the future, so the old pre-flight
    // accepted it — but it floors to 00:00 today, which is in the past.
    const laterToday = new Date();
    laterToday.setUTCHours(23, 0, 0, 0);

    const deps = {
      repository: {
        create: async () => {
          created.push("subscriptions.create");
          throw new Error("create must not be reached");
        },
      },
      currencyService: { getRates: async () => ({}) },
      userService: { getUserPreferences: async () => preferences },
    };

    const attempt = SubscriptionService.addSubscription(
      "user_1",
      {
        name: "Netflix",
        cost: 12,
        currency: "usd",
        every: 1,
        period: SubscriptionPeriod.MONTH,
        paymentDate: new Date(Date.now() + 86_400_000).toISOString(),
        autoPaid: false,
        categoryId: null,
        notes: null,
        brandDomain: null,
        willBeCancelledAt: null,
        intro: {
          kind: "trial",
          promoCost: 0,
          endsAt: laterToday.toISOString(),
        },
      } as never,
      deps as never,
    );

    await expect(attempt).rejects.toThrow(
      "Scheduled effective date must be in the future",
    );

    // The whole point of the bug: the row must not exist afterwards. There is
    // no transaction to roll back on neon-http, so validation has to come first.
    expect(created).toEqual([]);
  });
});
