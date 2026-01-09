import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_URL,
  enabled: process.env.NODE_ENV !== "development",
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,

  tracesSampler: (samplingContext) => {
    const context = samplingContext.transactionContext;
    const name = context && context.name ? context.name.toLowerCase() : "";

    // If we have absolutely no name, it's likely internal noise or startup.
    // Sample very low (1%).
    if (!name) return 0.01;

    // Filter out noise
    if (
      name.includes("health") ||
      name.includes("favicon") ||
      name.includes("_next/static") ||
      name.includes("monitoring")
    ) {
      return 0.0;
    }

    // Matches actions like "getSubscriptionsAction", "addSubscriptionAction", etc.
    if (name.includes("action")) {
      return 1.0;
    }

    const requestMethod = samplingContext.request?.method;

    if (requestMethod && requestMethod !== "GET" && requestMethod !== "HEAD") {
      // POST/PUT/DELETE usually means data mutation.
      // 20% sample rate is a good balance for free tier.
      return 0.2;
    }

    // Standard page loads, GET requests, etc.
    return 0.01;
  },

  // Disable PII to reduce payload size and liability
  sendDefaultPii: false,
});
