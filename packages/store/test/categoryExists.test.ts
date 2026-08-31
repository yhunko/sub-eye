import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import {
  addSubscription,
  SubscriptionCategoryNotFoundError,
  updateSubscription,
} from "../src";
import { NOW, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

const addPayload = {
  name: "Netflix",
  cost: 15,
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  paymentDate: "2026-03-01T00:00:00.000Z",
  autoPaid: true,
  categoryId: "cat_missing",
  notes: null,
  brandDomain: "netflix.com",
  willBeCancelledAt: null,
};

// The store is single-tenant, so "belongs to someone else" is not a case it can
// see: a foreign category is simply absent from the ports the host builds. What
// survives is the half that is still the store's business — a subscription may
// not point at a category that does not exist.
describe("a subscription's category must exist", () => {
  it("rejects add when the category is missing", async () => {
    const ports = inMemoryPorts({ now: NOW });

    await expect(addSubscription(ports, addPayload)).rejects.toBeInstanceOf(
      SubscriptionCategoryNotFoundError,
    );
    expect(ports.dump().subscriptions).toEqual([]);
  });

  it("rejects update when the category is missing", async () => {
    const ports = inMemoryPorts({
      now: NOW,
      subscriptions: [subscriptionRecord()],
    });

    await expect(
      updateSubscription(ports, "sub_1", { categoryId: "cat_missing" }),
    ).rejects.toBeInstanceOf(SubscriptionCategoryNotFoundError);
    expect(ports.dump().subscriptions[0]?.categoryId).toBeNull();
  });

  it("accepts a category that exists", async () => {
    const ports = inMemoryPorts({
      now: NOW,
      categories: [
        {
          id: "cat_1",
          name: "Streaming",
          emoji: "📺",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const dto = await addSubscription(ports, {
      ...addPayload,
      categoryId: "cat_1",
    });

    expect(dto.category).toEqual({
      id: "cat_1",
      name: "Streaming",
      emoji: "📺",
    });
  });
});
