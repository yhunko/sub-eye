import type { ServerRpcType } from "@subeye/server/client";
import { hc } from "hono/client";
import { env } from "@/shared/config/env";
import { createAuthFetch } from "./auth-fetch";

type TokenGetter = () => Promise<string | null>;

// Defaults to anonymous; swapped for Clerk's getToken() once the TokenBridge
// mounts under ClerkProvider (see app/_layout.tsx).
let getToken: TokenGetter = async () => null;

export function setTokenGetter(getter: TokenGetter): void {
  getToken = getter;
}

// Built ONCE at module load over a single mutable module-level getter. Never
// rebuild the client on an auth change and never reset the getter on sign-out:
// Clerk's getToken() is offline-cached and returns null when signed out, so
// anonymous and signed-in are both correct with no reset.
//
// `hc` comes from `hono` directly (a mobile dependency) because
// @subeye/server/client is a TYPES-ONLY build — it exports ServerRpcType, not a
// runtime factory.
//
// The server sets .basePath("/api") and has no version segment, so the base URL
// is env.API_URL + "/api".
export const apiClient = hc<ServerRpcType>(`${env.API_URL}/api`, {
  fetch: createAuthFetch({ getToken: () => getToken() }),
});
