import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { devRouter, devRoutesEnabled } from "../src/routes/dev";

/**
 * The dev router exposes endpoints that send REAL web-push and Telegram
 * messages. It must be unreachable unless ENABLE_DEV_ROUTES === "true" is
 * present on the Worker bindings. These tests are the regression guard for a
 * production auth bypass — do not weaken them.
 *
 * `devRoutesEnabled` falls back to `process.env` for local Bun dev, and
 * `bun test` auto-loads apps/server/.env — which sets ENABLE_DEV_ROUTES=true
 * on a developer machine. Every case below therefore controls the variable
 * explicitly, so the guard proves the same thing on a laptop and in CI.
 */

const originalFlag = process.env.ENABLE_DEV_ROUTES;

beforeEach(() => {
  delete process.env.ENABLE_DEV_ROUTES;
});

afterAll(() => {
  if (originalFlag === undefined) {
    delete process.env.ENABLE_DEV_ROUTES;
  } else {
    process.env.ENABLE_DEV_ROUTES = originalFlag;
  }
});

const buildApp = () => new Hono().route("/api/dev", devRouter);

const postTestRenewal = (env: Record<string, string>) =>
  buildApp().request(
    "/api/dev/notifications/test-renewal",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscriptionId: "sub_1", daysUntilPayment: 3 }),
    },
    env,
  );

describe("devRoutesEnabled", () => {
  it("is false when the flag is absent", () => {
    expect(devRoutesEnabled({})).toBe(false);
  });

  it("is false for any value other than the exact string 'true'", () => {
    expect(devRoutesEnabled({ ENABLE_DEV_ROUTES: "false" })).toBe(false);
    expect(devRoutesEnabled({ ENABLE_DEV_ROUTES: "1" })).toBe(false);
    expect(devRoutesEnabled({ ENABLE_DEV_ROUTES: "" })).toBe(false);
  });

  it("is true only for the exact string 'true'", () => {
    expect(devRoutesEnabled({ ENABLE_DEV_ROUTES: "true" })).toBe(true);
  });

  it("tolerates a non-object env without throwing", () => {
    expect(devRoutesEnabled(undefined)).toBe(false);
    expect(devRoutesEnabled(null)).toBe(false);
  });

  it("falls back to process.env for local Bun dev, where context.env is Bun's Server", () => {
    // Local dev runs plain Bun, not Wrangler, so bindings never reach
    // context.env. The fallback is what keeps the endpoints usable there.
    process.env.ENABLE_DEV_ROUTES = "true";
    expect(devRoutesEnabled({})).toBe(true);
    expect(devRoutesEnabled(undefined)).toBe(true);
  });

  it("does not open on a truthy-looking process.env value", () => {
    process.env.ENABLE_DEV_ROUTES = "1";
    expect(devRoutesEnabled({})).toBe(false);
  });
});

describe("/api/dev/* gate", () => {
  it("404s when ENABLE_DEV_ROUTES is absent, before auth is even consulted", async () => {
    const response = await postTestRenewal({});

    // 404, not 401: the gate must short-circuit ahead of `protect`, so an
    // attacker cannot distinguish "route exists but you are unauthorized".
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not Found" });
  });

  it("404s when ENABLE_DEV_ROUTES is set to something other than 'true'", async () => {
    const response = await postTestRenewal({ ENABLE_DEV_ROUTES: "yes" });

    expect(response.status).toBe(404);
  });

  it("404s for every dev endpoint, not just the renewal one", async () => {
    // The gate is router-level `.use("*")` middleware, so all three
    // notification-sending endpoints must be covered by it.
    const paths = [
      "/api/dev/notifications/test-renewal",
      "/api/dev/notifications/test-expiry",
      "/api/dev/notifications/test-phase-change",
    ];

    for (const path of paths) {
      const response = await buildApp().request(
        path,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
        {},
      );

      expect(response.status).toBe(404);
    }
  });

  it("cannot be opened by spoofing the Host header", async () => {
    // The previous guard read the hostname out of context.req.url, which a
    // Worker reconstructs from the client-supplied Host header. This is the
    // exact request that defeated it.
    const response = await buildApp().request(
      "/api/dev/notifications/test-renewal",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "localhost",
        },
        body: JSON.stringify({ subscriptionId: "sub_1", daysUntilPayment: 3 }),
      },
      {},
    );

    expect(response.status).toBe(404);
  });

  it("passes the request through to auth when ENABLE_DEV_ROUTES is 'true'", async () => {
    // With the gate open the request reaches `protect`, which rejects an
    // unauthenticated caller with 401. Any status that is not 404 proves the
    // gate opened; asserting 401 also proves auth still applies behind it.
    const app = new Hono()
      // `protect` calls @clerk/hono's getAuth(), which THROWS unless
      // clerkMiddleware() has populated the "clerkAuth" context key. In the
      // real app that happens globally in src/index.ts. Here we stub it with
      // an anonymous session so `protect` takes its 401 branch.
      .use("*", async (context, next) => {
        context.set("clerkAuth", () => ({ userId: null }));
        return await next();
      })
      .route("/api/dev", devRouter);

    const response = await app.request(
      "/api/dev/notifications/test-renewal",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscriptionId: "sub_1", daysUntilPayment: 3 }),
      },
      { ENABLE_DEV_ROUTES: "true" },
    );

    expect(response.status).not.toBe(404);
    expect(response.status).toBe(401);
  });
});
