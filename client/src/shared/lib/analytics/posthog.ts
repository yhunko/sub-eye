import posthog from "posthog-js";

export function initPostHog(key: string) {
  posthog.init(key, {
    api_host: "https://eu.i.posthog.com",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    persistence: "localStorage",
    ip: false,
  });
}

export { posthog };
