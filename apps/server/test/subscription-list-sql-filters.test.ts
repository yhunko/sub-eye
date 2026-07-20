import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import { SubscriptionService } from "../src/domains/subscription/subscriptionService";

const preferences = {
  preferredCurrency: "usd",
  preferredTimezone: "UTC",
  locale: "en",
};

const record = (over: Record<string, unknown>) => ({
  id: "sub",
  userId: "user_1",
  name: "Netflix",
  cost: "10.00",
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  autoPaid: true,
  categoryId: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  brandDomain: null,
  paymentDate: "2026-07-01T00:00:00.000Z",
  willBeCancelledAt: null,
  status: "active" as const,
  pausedAt: null,
  resumeAt: null,
  ...over,
});

describe("SubscriptionService.getSubscriptionsPage", () => {
  it("pushes search, status, category, sort and cursor down to the repository", async () => {
    let received: Record<string, unknown> | null = null;

    const deps = {
      repository: {
        findPageByUserId: async (args: Record<string, unknown>) => {
          received = args;
          return { rows: [record({ id: "a" })], nextCursor: "20" };
        },
      },
      phaseRepository: { findBySubscriptionIds: async () => [] },
      currencyService: { getRates: async () => ({}) },
      userService: { getUserPreferences: async () => preferences },
      categoryRepository: { findByUserId: async () => [] },
    };

    const page = await SubscriptionService.getSubscriptionsPage(
      "user_1",
      {
        search: "  NetFLIX ",
        status: "paused",
        categoryId: "cat_1",
        sortBy: "name",
        direction: "desc",
        cursor: "20",
        limit: 25,
      },
      deps as never,
    );

    const args = received as unknown as Record<string, unknown>;
    expect(args.userId).toBe("user_1");
    // Trimmed and lowercased so the SQL ILIKE is predictable.
    expect(args.search).toBe("netflix");
    expect(args.status).toBe("paused");
    expect(args.categoryId).toBe("cat_1");
    expect(args.sortBy).toBe("name");
    expect(args.direction).toBe("desc");
    expect(args.cursor).toBe("20");
    expect(args.limit).toBe(25);

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe("20");
  });

  it("defaults to active, nextPaymentDate ascending, limit 50", async () => {
    let received: Record<string, unknown> | null = null;

    const deps = {
      repository: {
        findPageByUserId: async (args: Record<string, unknown>) => {
          received = args;
          return { rows: [], nextCursor: null };
        },
      },
      phaseRepository: { findBySubscriptionIds: async () => [] },
      currencyService: { getRates: async () => ({}) },
      userService: { getUserPreferences: async () => preferences },
      categoryRepository: { findByUserId: async () => [] },
    };

    await SubscriptionService.getSubscriptionsPage("user_1", {}, deps as never);

    const args = received as unknown as Record<string, unknown>;
    expect(args.status).toBe("active");
    expect(args.sortBy).toBe("nextPaymentDate");
    expect(args.direction).toBe("asc");
    expect(args.limit).toBe(50);
    expect(args.search).toBeUndefined();
  });
});

describe("SubscriptionDto shape", () => {
  it("embeds the category and omits userId and qstashMessageId", async () => {
    const deps = {
      repository: {
        findPageByUserId: async () => ({
          rows: [record({ id: "a", categoryId: "cat_1" })],
          nextCursor: null,
        }),
      },
      phaseRepository: { findBySubscriptionIds: async () => [] },
      currencyService: { getRates: async () => ({}) },
      userService: { getUserPreferences: async () => preferences },
      categoryRepository: {
        findByUserId: async () => [
          { id: "cat_1", userId: "user_1", name: "Streaming", emoji: "📺" },
        ],
      },
    };

    const page = await SubscriptionService.getSubscriptionsPage(
      "user_1",
      {},
      deps as never,
    );
    const dto = page.items[0] as Record<string, unknown>;

    // The client should not need a second request to render a category chip.
    expect(dto.category).toEqual({
      id: "cat_1",
      name: "Streaming",
      emoji: "📺",
    });
    expect(dto).not.toHaveProperty("userId");
    expect(dto).not.toHaveProperty("qstashMessageId");
  });
});
