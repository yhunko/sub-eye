import { useAuth } from "@clerk/clerk-react";
import { type PropsWithChildren, useEffect } from "react";
import { initPostHog, posthog } from "@/shared/lib/analytics";

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const { userId, isLoaded } = useAuth();

  useEffect(() => {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    if (key) {
      initPostHog(key);
    }
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
