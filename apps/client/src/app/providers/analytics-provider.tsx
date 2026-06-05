import { useAuth } from "@clerk/clerk-react";
import { type PropsWithChildren, useEffect } from "react";
import { initPostHog, posthog } from "@/shared/lib/analytics";

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const { userId, isLoaded } = useAuth();

  useEffect(() => {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    if (!key) return;

    // Defer the posthog-js download to first idle so it never competes with
    // hydration or initial interactions.
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(() => initPostHog(key));
      return () => window.cancelIdleCallback(handle);
    }

    const handle = window.setTimeout(() => initPostHog(key), 1);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (userId) {
      posthog.identify(userId);
    } else {
      posthog.reset();
    }
  }, [userId, isLoaded]);

  return <>{children}</>;
}
