// EXPO_PUBLIC_* vars are inlined by Metro at bundle time — changing .env needs a
// Metro restart, not a reload. Validate at module load so a misconfigured build
// fails loudly at boot instead of sending requests to the string "undefined".
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  // Origin of the SubEye Worker, WITHOUT a trailing slash and WITHOUT /api — the
  // server's basePath("/api") rides on the Hono RPC `.api` accessor, so
  // shared/api/client.ts passes this origin to `hc` verbatim.
  API_URL: required("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL),
  CLERK_PUBLISHABLE_KEY: required(
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  ),
  // RevenueCat's PUBLIC SDK key: `appl_…` for a store build, `test_…` for the
  // Test Store during development. Required, like the Clerk key — a paywall that
  // silently fails to configure sells nothing and reports nothing.
  REVENUECAT_IOS_KEY: required(
    "EXPO_PUBLIC_REVENUECAT_IOS_KEY",
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  ),
  // Optional, and the only var here that is. Brandfetch's search endpoint
  // serves anonymous requests, so brand search works without it — but the
  // parameter is documented as required, so an id is what keeps it working.
  // Either way a decorative lookup must never be able to brick the boot.
  BRANDFETCH_CLIENT_ID: process.env.EXPO_PUBLIC_BRANDFETCH_CLIENT_ID ?? null,
} as const;
