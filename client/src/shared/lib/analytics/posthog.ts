import posthog from "posthog-js";

export function initPostHog(key: string) {
  if (posthog.__loaded) return;
  posthog.init(key, {
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
}

export { posthog };
