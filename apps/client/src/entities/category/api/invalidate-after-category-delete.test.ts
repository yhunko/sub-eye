import { describe, expect, it } from "bun:test";
import { analyticsQueryKeys } from "@/entities/analytics/model/query-keys";
import { billingQueryKeys } from "@/entities/billing/model/query-keys";
import { subscriptionsQueryKeys } from "@/entities/subscription/model/query-keys";
import { categoriesQueryKeys } from "../model/query-keys";
import { invalidateAfterCategoryDelete } from "./invalidate-after-category-delete";

describe("invalidateAfterCategoryDelete", () => {
  it("invalidates categories, subscriptions, analytics, and billing usage caches", async () => {
    const calls: unknown[] = [];

    await invalidateAfterCategoryDelete({
      invalidateQueries: async ({ queryKey }) => {
        calls.push(queryKey);
      },
    });

    expect(calls).toEqual([
      categoriesQueryKeys.list._def,
      subscriptionsQueryKeys.list._def,
      analyticsQueryKeys._def,
      billingQueryKeys.usage._def,
    ]);
  });
});
