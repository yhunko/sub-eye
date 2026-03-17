import type { Context } from "hono";

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

  if (error instanceof Error) {
    console.error("[Route Error]", error);
    return context.json({ error: error.message }, 500);
  }

  return context.json({ error: "Internal Server Error" }, 500);
};
