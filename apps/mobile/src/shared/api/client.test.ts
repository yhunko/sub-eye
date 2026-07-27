import { afterEach, describe, expect, it } from "bun:test";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function capture(): { urls: string[]; auth: (string | null)[] } {
  const urls: string[] = [];
  const auth: (string | null)[] = [];
  globalThis.fetch = ((input: unknown, init?: RequestInit) => {
    urls.push(input instanceof Request ? input.url : String(input));
    auth.push(new Headers(init?.headers).get("Authorization"));
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as typeof fetch;
  return { urls, auth };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("apiClient", () => {
  // Must run FIRST: it is the only test where the token bridge is still unwired,
  // and setTokenGetter is module-global state the later tests inherit.
  it("holds the first request until the token bridge is wired", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.test";
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_x";
    const captured = capture();

    const { apiClient, setTokenGetter } = await import("./client");

    // The tab tree mounts before Clerk resolves, so a refetch can fire while the
    // getter is still unset. Sending it anonymous would 401 a signed-in user.
    const inFlight = apiClient.api.analytics.dashboard.$get();
    await flush();
    const sentBeforeBridge = captured.urls.length > 0;

    setTokenGetter(async () => "tok_1");
    await inFlight;

    expect(sentBeforeBridge).toBe(false);
    expect(captured.auth[0]).toBe("Bearer tok_1");
  });

  // The server mounts every route under `.basePath("/api")`, which Hono RPC
  // reflects as the `.api` accessor at the call site (`apiClient.api.…`). So the
  // base URL handed to `hc` must be the bare origin — appending `/api` there
  // doubles the prefix and every request 404s at `/api/api/…`.
  it("hits /api/analytics/dashboard exactly once (no doubled basePath)", async () => {
    const captured = capture();

    const { apiClient } = await import("./client");
    await apiClient.api.analytics.dashboard.$get();

    expect(captured.urls[0]).toBe("https://api.test/api/analytics/dashboard");
  });
});
