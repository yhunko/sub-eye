import { afterEach, describe, expect, it } from "bun:test";

// The server mounts every route under `.basePath("/api")`, which Hono RPC
// reflects as the `.api` accessor at the call site (`apiClient.api.…`). So the
// base URL handed to `hc` must be the bare origin — appending `/api` there
// doubles the prefix and every request 404s at `/api/api/…`.
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function captureUrl(): { urls: string[] } {
  const urls: string[] = [];
  globalThis.fetch = ((input: unknown) => {
    urls.push(input instanceof Request ? input.url : String(input));
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as typeof fetch;
  return { urls };
}

describe("apiClient", () => {
  it("hits /api/analytics/dashboard exactly once (no doubled basePath)", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.test";
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_x";
    const captured = captureUrl();

    const { apiClient } = await import("./client");
    await apiClient.api.analytics.dashboard.$get();

    expect(captured.urls[0]).toBe("https://api.test/api/analytics/dashboard");
  });
});
