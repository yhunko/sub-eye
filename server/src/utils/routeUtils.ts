import type { Context } from "hono";

export const handleServiceError = (context: Context, error: unknown) => {
  if (error instanceof Error && "status" in error) {
    return context.json(
      { error: error.message },
      error.status as 400 | 403 | 404,
    );
  }
  return context.json({ error: "Internal Server Error" }, 500);
};
