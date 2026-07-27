import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { setTokenGetter } from "@/shared/api";
import { sessionHint } from "./session-hint";

// Feeds Clerk's session token into the shared transport. getToken() is
// offline-cached by Clerk and returns null when signed out, so the transport is
// correct in both anonymous and signed-in states with no reset needed.
//
// Also records whether a session exists, so the next cold start can mount the
// app before Clerk finishes its handshake (see shared/auth/session-hint).
export function useClerkTokenBridge(): void {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (isLoaded) sessionHint.write(isSignedIn === true);
  }, [isLoaded, isSignedIn]);
}
