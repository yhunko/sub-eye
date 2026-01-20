import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN_URL,
  enabled: process.env.NODE_ENV !== "development",
  environment: process.env.NEXT_PUBLIC_APP_ENV,

  // Keep edge tracing VERY low as it runs on every request (proxy)
  tracesSampleRate: 0.01,

  sendDefaultPii: false,
});
