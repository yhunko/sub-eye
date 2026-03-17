import type { Context } from "hono";
import { captureServerException } from "./analytics";

export const handleServiceError = (context: Context, error: unknown) => {
  if (error instanceof Error && "status" in error) {
    const status = typeof error.status === "number" ? error.status : undefined;

    if (status) {
      return context.json(
        { error: error.message },
        status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
      );
    }
  }

  console.error("[Route Error]", error);

  const apiKey = (context.env as Record<string, string | undefined>)
    ?.POSTHOG_KEY;
  if (apiKey) {
    void captureServerException(error, apiKey);
  }

  if (error instanceof Error) {
    return context.json({ error: error.message }, 500);
  }

  return context.json({ error: "Internal Server Error" }, 500);
};
