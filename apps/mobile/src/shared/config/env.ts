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
  // Origin of the SubEye Worker, WITHOUT a trailing slash and WITHOUT /api —
  // shared/api/client.ts appends `/api` (the server's basePath; there is no
  // version segment).
  API_URL: required("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL),
  CLERK_PUBLISHABLE_KEY: required(
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  ),
} as const;
