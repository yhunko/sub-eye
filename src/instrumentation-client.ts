import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: "2025-11-30",
});

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_URL,
  enabled: process.env.NODE_ENV !== "development",
  environment: process.env.NEXT_PUBLIC_APP_ENV,

  tracesSampler: (samplingContext) => {
    // If the server decided to sample this request, respect that decision.
    if (samplingContext.parentSampled) {
      return 1.0;
    }

    return 0.01;
  },

  beforeSend(event, hint) {
    const error = hint.originalException;
    if (error instanceof Error) {
      // Ignore ResizeObserver loops (very common harmless browser error)
      if (error.message.includes("ResizeObserver")) return null;
      // Ignore Hydration errors if they are just warnings (optional)
      // if (error.message.includes("Hydration failed")) return null;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
