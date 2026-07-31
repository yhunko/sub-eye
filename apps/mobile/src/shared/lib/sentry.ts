import * as Sentry from "@sentry/react-native";
import { env } from "@/shared/config/env";

/**
 * Client crash reporting. Everything that reports an error routes through this
 * file, and `Sentry.init` runs on import so the SDK's global handlers — the
 * ErrorUtils hook and the promise-rejection hook it installs itself — are in
 * place before the modules that might trip them (see app/_layout.tsx).
 *
 * Without a DSN the SDK is inert rather than absent: `enabled: false` keeps the
 * capture calls valid no-ops, so a checkout with no Sentry configured behaves
 * exactly like one that has it and simply reports nothing.
 *
 * NOTHING BELOW SETS `tracesSampleRate`, and that is load-bearing. This is crash
 * reporting, not an observability platform, and the SDK turns tracing on for
 * `typeof tracesSampleRate === "number"` — so a literal `0` still installs stall
 * tracking, native frame tracking and the app-start/AppRegistry hooks: per-frame
 * work on the JS thread whose every transaction is then thrown away. Omitting
 * the key is what actually costs nothing. No profiling, no replay, no
 * screenshots either.
 *
 * The native app-hang and watchdog-termination detectors are NOT part of that
 * and stay on by default — an ANR or an OOM kill is a crash, and this is where
 * it should surface. Being offline at the moment of one is the normal case on a
 * phone; the native layer caches the envelope and flushes it on the next launch.
 */
Sentry.init({
  dsn: env.SENTRY_DSN ?? undefined,
  // A dev crash already has the red box, a symbolicated stack and Metro. Sending
  // those too only buries the store builds this exists for.
  enabled: !!env.SENTRY_DSN && !__DEV__,
  // No email, no username, no IP. The Clerk id set by shared/auth/token-bridge
  // is the only identifier an event carries, and it is what joins to the
  // server's PostHog distinct_id.
  sendDefaultPii: false,
  ignoreErrors: [
    // The user's train went into a tunnel. Already handled everywhere — the
    // screens render the cached view — and at this app's volume it would
    // out-number real crashes by orders of magnitude.
    "Network request failed",
  ],
});

/**
 * Report an error without being able to become one.
 *
 * The root error boundary calls this when Clerk, Query or the navigator have
 * already failed, so there is no handler left above it: a throw here would
 * replace a rendered "something went wrong" screen with a dead white window.
 */
export function reportError(
  error: unknown,
  tags?: Record<string, string>,
): void {
  try {
    Sentry.captureException(error, tags ? { tags } : undefined);
  } catch {
    // Nothing left to do with it. Losing the report is survivable; crashing the
    // crash reporter is not.
  }
}

/** The Clerk user id, or null on sign-out. Never an email or a username. */
export function setSentryUser(userId: string | null): void {
  try {
    Sentry.setUser(userId ? { id: userId } : null);
  } catch {
    // Identity is an enrichment. Events without it are still worth having.
  }
}
