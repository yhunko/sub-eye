import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_URL,
  enabled: process.env.NODE_ENV !== "development",
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,

  tracesSampler: (samplingContext) => {
    const name = samplingContext.transactionContext.name;
    const op = samplingContext.transactionContext.op;

    // Ignore health checks, static files, and internal Next.js prefetching
    if (
      name.includes("health") ||
      name.includes("favicon") ||
      name.includes("_next/static")
    ) {
      return 0.0;
    }

    // Name instrumented functions "somethingAction",
    // we capture 100% of them. This gives you full visibility on logic
    // without manual config.
    if (name.toLowerCase().includes("action")) {
      return 1.0;
    }

    // If it's not a GET request (e.g. POST to an API route), it's likely
    // a form submission or data change. We want decent visibility here.
    if (
      samplingContext.request?.method &&
      samplingContext.request.method !== "GET"
    ) {
      return 0.2;
    }

    // Generic page views (GET requests). We keep this very low because
    // usually if a page crashes, the "Error" event will catch it anyway.
    // We don't need performance traces for every page load.
    return 0.01;
  },

  // Don't send PII
  sendDefaultPii: false,
});
