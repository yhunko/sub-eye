import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { setTokenGetter } from "@/shared/api";

// Feeds Clerk's session token into the shared transport. getToken() is
// offline-cached by Clerk and returns null when signed out, so the transport is
// correct in both anonymous and signed-in states with no reset needed.
export function useClerkTokenBridge(): void {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);
}
