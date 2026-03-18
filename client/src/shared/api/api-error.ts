export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Narrows a Hono RPC response to the 2xx branch so `res.json()` returns
 * the success type without a cast.
 *
 * No-op at runtime — the fetch wrapper already throws ApiError for non-OK
 * responses before they reach call sites.
 */
export function assertOk<T extends { ok: boolean }>(
  _res: T,
): asserts _res is T & { ok: true } {}
