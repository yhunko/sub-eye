import { describe, expect, it } from "bun:test";
import { QueryObserver } from "@tanstack/react-query";

const { queryClient, resetQueryCache } = await import("./query");

describe("resetQueryCache", () => {
  it("repaints a mounted observer instead of stranding it on removed data", async () => {
    let erased = false;
    const observer = new QueryObserver(queryClient, {
      queryKey: ["subscriptions"],
      queryFn: async () => (erased ? [] : [{ id: "a" }]),
    });
    const unsubscribe = observer.subscribe(() => {});
    await observer.refetch();
    expect(observer.getCurrentResult().data).toEqual([{ id: "a" }]);

    // What "Erase all data" does: empty the store, then reset Query. `clear()`
    // here leaves the observer holding the pre-erase list — the screen keeps
    // showing subscriptions that no longer exist until the next cold start.
    erased = true;
    await resetQueryCache();

    expect(observer.getCurrentResult().data).toEqual([]);
    unsubscribe();
  });
});
