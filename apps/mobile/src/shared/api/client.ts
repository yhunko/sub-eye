import type { ServerRpcType } from "@subeye/server/client";
import { hc } from "hono/client";
import { env } from "@/shared/config/env";
import { createAuthFetch } from "./auth-fetch";

type TokenGetter = () => Promise<string | null>;

let getToken: TokenGetter | null = null;
let markBridged: () => void = () => {};

// The tab tree now mounts from the persisted cache BEFORE Clerk finishes its
// handshake, so a refetch can fire while the bridge is still unset. Defaulting
// to null there would send it out anonymous and 401 a signed-in user, so the
// first request waits for the bridge instead.
//
// ponytail: one fixed 3s ceiling, no retry or backoff. Past it the request goes
// out anonymous and the server answers 401 — the same state an expired session
// produces, which the screens already handle.
const bridgeReady = new Promise<void>((resolve) => {
  markBridged = resolve;
  setTimeout(resolve, 3000);
});

// Swapped for Clerk's getToken() once the TokenBridge mounts under
// ClerkProvider (see app/_layout.tsx). Never reset on sign-out: Clerk's
// getToken() is offline-cached and returns null when signed out, so anonymous
// and signed-in are both correct without one.
export function setTokenGetter(getter: TokenGetter): void {
  getToken = getter;
  markBridged();
}

async function currentToken(): Promise<string | null> {
  if (!getToken) await bridgeReady;
  return getToken ? getToken() : null;
}

// Built ONCE at module load over a single mutable module-level getter — never
// rebuild the client on an auth change.
//
// `hc` comes from `hono` directly (a mobile dependency) because
// @subeye/server/client is a TYPES-ONLY build — it exports ServerRpcType, not a
// runtime factory.
//
// The server's .basePath("/api") is reflected by Hono RPC as the `.api` accessor
// at call sites (apiClient.api.analytics.…), so the base URL is the bare origin.
// Appending "/api" here would double the prefix and every request would 404 at
// /api/api/….
export const apiClient = hc<ServerRpcType>(env.API_URL, {
  fetch: createAuthFetch({ getToken: currentToken }),
});
