import type { ApiErrorBody, ApiErrorCode } from "@subeye/model";
import type { Context } from "hono";
import { reportServerException } from "./analytics";

type CodedError = Error & { status?: unknown; code?: unknown };

const hasNumericStatus = (
  error: unknown,
): error is CodedError & { status: number } =>
  error instanceof Error &&
  "status" in error &&
  typeof (error as CodedError).status === "number";

/**
 * The one error shape the API emits. The client branches on `code`, so anything
 * that answers non-2xx in another shape reaches it as a codeless generic
 * failure — see apps/mobile/CLAUDE.md.
 */
export const apiErrorBody = (
  code: ApiErrorCode,
  message: string,
): ApiErrorBody => ({
  success: false,
  error: { code, message },
});

/**
 * `vValidator`'s third argument. Without it the validator answers a rejected
 * payload with valibot's own result object — an `issues` array and no `error`
 * key at all — so the one declared code the client could branch on
 * (`VALIDATION_FAILED`) is never emitted. The schemas carry their own messages,
 * so the first issue is the most useful sentence available.
 */
export const onInvalid = (
  result: { success: boolean; issues?: ReadonlyArray<{ message: string }> },
  context: Context,
) => {
  if (result.success) return;

  return context.json(
    apiErrorBody(
      "VALIDATION_FAILED",
      result.issues?.[0]?.message ?? "Invalid request",
    ),
    400,
  );
};

export const handleServiceError = (context: Context, error: unknown) => {
  if (hasNumericStatus(error)) {
    const status = error.status;

    reportServerException(context, error, { responseStatus: status });

    // Every domain error carries a `code`; anything else that happens to have a
    // numeric status still gets its status, with a generic code.
    const code: ApiErrorCode =
      typeof error.code === "string"
        ? (error.code as ApiErrorCode)
        : "INTERNAL_ERROR";

    // Narrow literals only: a widened ContentfulStatusCode leaks the error
    // shape into the Hono RPC success type on the client.
    return context.json(
      apiErrorBody(code, error.message),
      status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
    );
  }

  console.error("[Route Error]", error);

  reportServerException(context, error, {
    handled: false,
    responseStatus: 500,
  });

  // Never surface an unrecognised throw's message — it may contain internals.
  return context.json(
    apiErrorBody("INTERNAL_ERROR", "Internal Server Error"),
    500,
  );
};
