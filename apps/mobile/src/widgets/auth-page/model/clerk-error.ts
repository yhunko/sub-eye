type ClerkFieldError = {
  code?: string;
  message?: string;
  longMessage?: string;
};

/**
 * Reads Clerk's `{ errors: [{ code, message, longMessage }] }` shape structurally
 * rather than through `isClerkAPIResponseError`, so this stays a pure function
 * with no SDK import — and so a thrown `Error`, a rejected fetch, or `undefined`
 * all fall through to null instead of crashing the screen that is already
 * showing a failure.
 */
function firstError(err: unknown): ClerkFieldError | null {
  if (typeof err !== "object" || err === null) return null;
  const errors = (err as { errors?: unknown }).errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const first: unknown = errors[0];
  if (typeof first !== "object" || first === null) return null;
  return first as ClerkFieldError;
}

/** Branch on this, never on the message — Clerk's copy is not a contract. */
export function clerkErrorCode(err: unknown): string | null {
  return firstError(err)?.code ?? null;
}

/**
 * Clerk's own human copy, for codes we have no translation for. `longMessage`
 * is the actionable one ("Password must be 8 characters or more"); `message` is
 * the terse label ("is too short").
 */
export function clerkErrorText(err: unknown): string | null {
  const first = firstError(err);
  return first?.longMessage ?? first?.message ?? null;
}
