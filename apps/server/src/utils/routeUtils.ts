import type { Context } from "hono";
import { captureServerException, extractRequestContext } from "./analytics";

export const handleServiceError = (context: Context, error: unknown) => {
  const apiKey = (context.env as Record<string, string | undefined>)
    ?.POSTHOG_KEY;
  const requestContext = extractRequestContext(context);

  if (error instanceof Error && "status" in error) {
    const status = typeof error.status === "number" ? error.status : undefined;

    if (status) {
      if (apiKey) {
        void captureServerException(error, apiKey, {
          requestContext: { ...requestContext, responseStatus: status },
        });
      }
      return context.json(
        { error: error.message },
        status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
      );
    }
  }

  console.error("[Route Error]", error);

  if (apiKey) {
    void captureServerException(error, apiKey, {
      handled: false,
      requestContext: { ...requestContext, responseStatus: 500 },
    });
  }

  if (error instanceof Error) {
    return context.json({ error: error.message }, 500);
  }

  return context.json({ error: "Internal Server Error" }, 500);
};
