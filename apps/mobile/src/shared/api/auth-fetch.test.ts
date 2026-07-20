import { afterEach, describe, expect, it } from "bun:test";
import { ApiError } from "./api-error";
import { createAuthFetch } from "./auth-fetch";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// Records the init object the transport handed to the real fetch, so we can
// assert on the headers it built rather than on any internal state.
function stubFetch(response: Response) {
  const calls: RequestInit[] = [];
  globalThis.fetch = ((_input: unknown, init?: RequestInit) => {
    calls.push(init ?? {});
    return Promise.resolve(response);
  }) as typeof fetch;
  return calls;
}

describe("createAuthFetch", () => {
  it("attaches the bearer token when the getter returns one", async () => {
    const calls = stubFetch(new Response("{}", { status: 200 }));
    const authFetch = createAuthFetch({ getToken: async () => "tok_123" });

    await authFetch("https://api.test/api/analytics/dashboard");

    expect(new Headers(calls[0]?.headers).get("Authorization")).toBe(
      "Bearer tok_123",
    );
  });

  it("sends no Authorization header when signed out (getter returns null)", async () => {
    const calls = stubFetch(new Response("{}", { status: 200 }));
    const authFetch = createAuthFetch({ getToken: async () => null });

    await authFetch("https://api.test/api/analytics/dashboard");

    expect(new Headers(calls[0]?.headers).get("Authorization")).toBeNull();
  });

  it("keeps per-request headers and lets them override the defaults", async () => {
    const calls = stubFetch(new Response("{}", { status: 200 }));
    const authFetch = createAuthFetch({ getToken: async () => "tok_123" });

    await authFetch("https://api.test/api/subscriptions", {
      headers: { "Content-Type": "application/json" },
    });

    expect(new Headers(calls[0]?.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("throws an ApiError carrying the server's error code on a non-2xx", async () => {
    stubFetch(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: "SUBSCRIPTION_NOT_FOUND", message: "No such thing" },
        }),
        { status: 404 },
      ),
    );
    const authFetch = createAuthFetch({ getToken: async () => null });

    const error = await authFetch("https://api.test/api/subscriptions/x").catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).code).toBe("SUBSCRIPTION_NOT_FOUND");
    expect((error as ApiError).message).toBe("No such thing");
  });

  it("still throws a usable ApiError when the body is not our error shape", async () => {
    stubFetch(new Response("<html>gateway timeout</html>", { status: 504 }));
    const authFetch = createAuthFetch({ getToken: async () => null });

    const error = await authFetch("https://api.test/api/subscriptions").catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(504);
    expect((error as ApiError).code).toBeNull();
  });
});
