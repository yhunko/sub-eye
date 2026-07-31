import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { setTokenGetter } from "@/shared/api";
import { setSentryUser } from "@/shared/lib/sentry";
import { sessionHint } from "./session-hint";

// Feeds Clerk's session token into the shared transport. getToken() is
// offline-cached by Clerk and returns null when signed out, so the transport is
// correct in both anonymous and signed-in states with no reset needed.
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
