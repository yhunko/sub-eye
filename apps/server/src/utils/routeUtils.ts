import type { ApiErrorBody, ApiErrorCode } from "@subeye/shared";
import type { Context } from "hono";
import { captureServerException, extractRequestContext } from "./analytics";

type CodedError = Error & { status?: unknown; code?: unknown };

const hasNumericStatus = (
  error: unknown,
): error is CodedError & { status: number } =>
  error instanceof Error &&
  "status" in error &&
  typeof (error as CodedError).status === "number";

const body = (code: ApiErrorCode, message: string): ApiErrorBody => ({
  success: false,
  error: { code, message },
});

export const handleServiceError = (context: Context, error: unknown) => {
  const apiKey = (context.env as Record<string, string | undefined>)
    ?.POSTHOG_KEY;
  const requestContext = extractRequestContext(context);

  if (hasNumericStatus(error)) {
    const status = error.status;

    if (apiKey) {
      void captureServerException(error, apiKey, {
        requestContext: { ...requestContext, responseStatus: status },
      });
    }

    // Every domain error carries a `code`; anything else that happens to have a
    // numeric status still gets its status, with a generic code.
    const code: ApiErrorCode =
      typeof error.code === "string"
        ? (error.code as ApiErrorCode)
        : "INTERNAL_ERROR";

    // Narrow literals only: a widened ContentfulStatusCode leaks the error
    // shape into the Hono RPC success type on the client.
    return context.json(
      body(code, error.message),
      status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
    );
  }

  console.error("[Route Error]", error);

  if (apiKey) {
    void captureServerException(error, apiKey, {
      handled: false,
      requestContext: { ...requestContext, responseStatus: 500 },
    });
  }

  // Never surface an unrecognised throw's message — it may contain internals.
  return context.json(body("INTERNAL_ERROR", "Internal Server Error"), 500);
};
