import type { PostHog } from "posthog-js";

let instance: PostHog | null = null;
let pending: Array<(ph: PostHog) => void> = [];

function withPostHog(run: (ph: PostHog) => void): void {
  if (instance) {
    run(instance);
    return;
  }

  pending.push(run);
}

export function initPostHog(key: string): void {
  if (instance) return;

  // posthog-js (~170 KB) is dynamically imported so it stays out of the
  // initial bundle and only downloads once analytics is initialized (after
  // hydration / first idle — see AnalyticsProvider).
  void import("posthog-js").then(({ default: posthogJs }) => {
    if (instance) return;

    posthogJs.init(key, {
      api_host: "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: true,
      disable_session_recording: true,
      persistence: "localStorage",
      ip: false,
    });

    instance = posthogJs;

    const queued = pending;
    pending = [];
    for (const run of queued) {
      run(posthogJs);
    }
  });
}

/**
 * Lazy facade over posthog-js. Calls made before the dynamic import resolves
 * are queued and flushed (in order) once PostHog is ready, so the deferred load
 * never drops early events or the initial `identify`. Exposes only the surface
 * the app uses; keep it in sync if new posthog APIs are needed.
 */
export const posthog = {
  capture(event: string, properties?: Record<string, unknown>): void {
    withPostHog((ph) => ph.capture(event, properties));
  },
  captureException(error: unknown, properties?: Record<string, unknown>): void {
    withPostHog((ph) => ph.captureException(error, properties));
  },
  identify(distinctId: string): void {
    withPostHog((ph) => ph.identify(distinctId));
  },
  reset(): void {
    withPostHog((ph) => ph.reset());
  },
};
