const POSTHOG_CAPTURE_URL = "https://eu.i.posthog.com/capture/";

interface CaptureExceptionOptions {
  handled?: boolean;
  extra?: Record<string, unknown>;
}

/**
 * Sends a $exception event to PostHog from the server.
 * Uses the raw capture endpoint — no SDK needed, works in any runtime (CF Worker, Bun, Node).
 * Never throws — analytics failures must not affect the error response.
 */
export const captureServerException = async (
  error: unknown,
  apiKey: string,
  { handled = true, extra }: CaptureExceptionOptions = {},
): Promise<void> => {
  const properties: Record<string, unknown> = {
    $exception_type: error instanceof Error ? error.name : "Error",
    $exception_message: error instanceof Error ? error.message : String(error),
    $exception_stack_trace_raw:
      error instanceof Error ? error.stack : undefined,
    $exception_is_handled: handled,
    ...extra,
  };

  try {
    await fetch(POSTHOG_CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event: "$exception",
        distinct_id: "server",
        properties,
      }),
    });
    return undefined;
  } catch {
    return undefined;
  }
};
