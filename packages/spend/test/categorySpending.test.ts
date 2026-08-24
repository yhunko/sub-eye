import { describe, expect, it } from "bun:test";
import {
  type CategoryDto,
  type SubscriptionDto,
  SubscriptionPeriod,
} from "@subeye/model";
import { AnalyticsCalculator } from "../src/analyticsCalculator";

function createSubscription({
  id,
  name,
  categoryId,
  monthly,
  brandDomain,
}: {
  id: string;
  name: string;
  categoryId: string | null;
  monthly: number;
  brandDomain: string | null;
}): SubscriptionDto {
  return {
    id,
    userId: "user_1",
    name,
    cost: monthly,
    currency: "usd",
    every: 1,
    period: SubscriptionPeriod.MONTH,
    paymentDate: "2026-01-01T00:00:00.000Z",
    autoPaid: true,
    categoryId,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    brandDomain,
    billing: {
      original: { currencyCode: "usd", monthly },
      preferred: {
        currencyCode: "usd",
        amount: monthly,
        monthly,
        yearly: monthly * 12,
        exchangeRate: 1,
      },
    },
    nextPaymentDate: "2026-02-01T00:00:00.000Z",
    lastPaymentDate: null,
    willBeCancelledAt: null,
    scheduledPriceChange: null,
    status: "active",
  };
}

describe("AnalyticsCalculator.buildCategorySpending", () => {
  it("returns per-category totals with subscription breakdown sorted by monthly cost", () => {
    const categories: CategoryDto[] = [
      {
        id: "cat_streaming",
        userId: "user_1",
        name: "Streaming",
        emoji: "🎬",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const categorySpending = AnalyticsCalculator.buildCategorySpending(
      [
        createSubscription({
          id: "sub_netflix",
          name: "Netflix",
          categoryId: "cat_streaming",
          monthly: 15.99,
          brandDomain: "netflix.com",
        }),
        createSubscription({
          id: "sub_spotify",
          name: "Spotify",
          categoryId: "cat_streaming",
          monthly: 11.99,
          brandDomain: "spotify.com",
        }),
        createSubscription({
          id: "sub_misc",
          name: "Unknown Tool",
          categoryId: null,
          monthly: 5,
          brandDomain: null,
        }),
      ],
      categories,
    );

    expect(categorySpending).toHaveLength(2);
    expect(categorySpending[0]).toEqual({
      categoryId: "cat_streaming",
      name: "Streaming",
      emoji: "🎬",
      amount: 27.98,
      subscriptions: [
        {
          id: "sub_netflix",
          name: "Netflix",
          brandDomain: "netflix.com",
          monthlyCost: 15.99,
        },
        {
          id: "sub_spotify",
          name: "Spotify",
          brandDomain: "spotify.com",
          monthlyCost: 11.99,
        },
      ],
    });
    expect(categorySpending[1]).toEqual({
      categoryId: null,
      name: "",
      emoji: "📦",
      amount: 5,
      subscriptions: [
        {
          id: "sub_misc",
          name: "Unknown Tool",
          brandDomain: null,
          monthlyCost: 5,
        },
      ],
    });
  });
});
