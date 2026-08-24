import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { setTokenGetter } from "@/shared/api";
import { setSentryUser } from "@/shared/lib/sentry";
import { sessionHint } from "./session-hint";

// Feeds Clerk's session token into the shared transport. getToken() returns
// null when signed out, so the transport is correct in both anonymous and
// signed-in states with no reset needed.
//
// It is NOT offline-capable: ClerkProvider is constructed with `tokenCache`
// only, so the cache is in-memory and about 60s wide. `tokenCache` persists the
// refresh material, not a usable session JWT, and without
// `__experimental_resourceCache` there is no client snapshot either — every
// cold start needs a live /v1/client round-trip before Clerk resolves signed-in.
// That is why `session-hint` exists, and why offline is a logout in practice.
//
// Also records whether a session exists, so the next cold start can mount the
// app before Clerk finishes its handshake (see shared/auth/session-hint), and
// stamps the Clerk id onto Sentry events. Sentry's identity lives here rather
// than in its own root-layout effect because this hook is already the one thing
// watching Clerk — a second watcher would resolve a frame apart from this one
// and attribute the crash between them to nobody.
export function useClerkTokenBridge(): void {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    // `isLoaded` gates both: before Clerk resolves, `userId` is undefined for a
    // signed-in user too, and clearing it there would strip the id off exactly
    // the cold-start crashes that are hardest to reproduce.
    if (!isLoaded) return;
    sessionHint.write(isSignedIn === true);
    setSentryUser(userId ?? null);
  }, [isLoaded, isSignedIn, userId]);
}
