import type { Context } from "hono";

const POSTHOG_CAPTURE_URL = "https://eu.i.posthog.com/capture/";

interface RequestContext {
  method: string;
  url: string;
  route?: string;
  userId?: string;
  /** Cloudflare Ray ID — unique per request, links error to CF logs */
  rayId?: string;
  userAgent?: string;
  responseStatus?: number;
}

interface CaptureExceptionOptions {
  handled?: boolean;
  extra?: Record<string, unknown>;
  requestContext?: RequestContext;
}

/**
 * Extracts request context from a Hono context for exception enrichment.
 * Safe to call from any route/middleware — never throws.
 */
export const extractRequestContext = (ctx: Context): RequestContext => ({
  method: ctx.req.method,
  url: ctx.req.url,
  route: ctx.req.routePath,
  userId: (ctx.get("userId") as string | undefined) ?? undefined,
  rayId: ctx.req.header("cf-ray"),
  userAgent: ctx.req.header("user-agent"),
});

/**
 * Sends a $exception event to PostHog from the server.
 * Uses the raw capture endpoint — no SDK needed, works in any runtime (CF Worker, Bun, Node).
 * Never throws — analytics failures must not affect the error response.
 */
export const captureServerException = async (
  error: unknown,
  apiKey: string,
  { handled = true, extra, requestContext }: CaptureExceptionOptions = {},
): Promise<void> => {
  const properties: Record<string, unknown> = {
    $exception_type: error instanceof Error ? error.name : "Error",
    $exception_message: error instanceof Error ? error.message : String(error),
    $exception_stack_trace_raw:
      error instanceof Error ? error.stack : undefined,
    $exception_is_handled: handled,
    ...(requestContext && {
      $http_method: requestContext.method,
      $http_url: requestContext.url,
      route: requestContext.route,
      ray_id: requestContext.rayId,
      user_agent: requestContext.userAgent,
      response_status: requestContext.responseStatus,
    }),
    ...extra,
  };

  try {
    await fetch(POSTHOG_CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event: "$exception",
        distinct_id: requestContext?.userId ?? "server",
        properties,
      }),
    });
  } catch {
    // analytics failures must never affect the error response
  }
};

/**
 * Reports an exception to PostHog for the rest of the request's lifetime.
 *
 * The capture is an outbound fetch, and a Worker cancels pending work the
 * moment the response is returned — a bare `void capture(...)` before
 * `return context.json(...)` loses an unknown share of the reports. Registering
 * it on the ExecutionContext is what keeps it alive. `executionCtx` THROWS
 * rather than returning undefined when there is none (`bun test`, and any
 * non-Worker runtime), which is the only reason for the catch.
 */
export const reportServerException = (
  ctx: Context,
  error: unknown,
  options: { handled?: boolean; responseStatus: number },
): void => {
  const apiKey = (ctx.env as Record<string, string | undefined>)?.POSTHOG_KEY;
  if (!apiKey) return;

  const capture = captureServerException(error, apiKey, {
    handled: options.handled,
    requestContext: {
      ...extractRequestContext(ctx),
      responseStatus: options.responseStatus,
    },
  });

  try {
    ctx.executionCtx.waitUntil(capture);
  } catch {
    // Outside a Worker there is nothing to register on; the fetch is in flight.
  }
};

interface CaptureEventOptions {
  distinctId: string;
  properties?: Record<string, unknown>;
}

/**
 * Sends a custom event to PostHog from the server.
 * Uses the raw capture endpoint — no SDK needed, works in any runtime.
 * Never throws — analytics failures must not affect the request.
 */
export const captureServerEvent = async (
  eventName: string,
  apiKey: string,
  { distinctId, properties }: CaptureEventOptions,
): Promise<void> => {
  try {
    await fetch(POSTHOG_CAPTURE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event: eventName,
        distinct_id: distinctId,
        properties: properties ?? {},
      }),
    });
  } catch {
    // analytics failures must never affect the request
  }
};
