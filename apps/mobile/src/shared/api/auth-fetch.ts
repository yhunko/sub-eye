import { ApiError } from "./api-error";

type ServerErrorEnvelope = {
  success: false;
  error: { code: string; message: string };
};

const parseErrorEnvelope = (body: unknown): ServerErrorEnvelope | null => {
  if (typeof body !== "object" || body === null) return null;
  const success = "success" in body ? body.success : undefined;
  const error = "error" in body ? body.error : undefined;
  if (
    success === false &&
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return body as ServerErrorEnvelope;
  }
  return null;
};

export type AuthFetchOptions = {
  /** Bearer token to attach, or null when anonymous. Awaited per request. */
  getToken: () => Promise<string | null> | string | null;
};

/**
 * The transport `fetch` behind the typed API client: attaches the Clerk bearer
 * token, merges headers, and converts any non-2xx response into a thrown
 * ApiError. The token SOURCE is injected rather than imported, so this module
 * has no dependency on Clerk and stays testable with a plain function.
 */
export function createAuthFetch(options: AuthFetchOptions): typeof fetch {
  // Typed with fetch's own parameter types so params aren't implicit-any; the
  // result is cast to `typeof fetch` at the boundary because a React Native
  // transport has no `preconnect` static (bun-types' global fetch requires one,
  // but Hono only ever invokes the call signature).
  const authFetch = async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> => {
    const token = await options.getToken();
    const headers = new Headers();
    new Headers(init?.headers).forEach((value, key) => {
      headers.set(key, value);
    });
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(input, { ...init, headers });

    if (!response.ok) {
      const envelope = parseErrorEnvelope(
        await response
          .clone()
          .json()
          .catch(() => null),
      );
      throw new ApiError(
        envelope?.error.message ?? "An unexpected error occurred",
        response.status,
        envelope?.error.code ?? null,
      );
    }

    return response;
  };
  return authFetch as typeof fetch;
}
