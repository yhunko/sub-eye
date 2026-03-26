import type { Context } from "hono";

const POSTHOG_CAPTURE_URL = "https://eu.i.posthog.com/capture/";

interface RequestContext {
  method: string;
  url: string;
  route?: string;
  userId?: string;
  orgId?: string;
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
  orgId: (ctx.get("orgId") as string | undefined) ?? undefined,
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
      org_id: requestContext.orgId,
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
