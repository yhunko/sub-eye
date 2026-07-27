// Every non-2xx response from the SubEye API becomes one of these. `code` is the
// machine-readable code from the server's { success:false, error:{code,message} }
// envelope, or null when the response was not that shape (a gateway HTML page,
// a network appliance, an old build).
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Narrows a Hono RPC response to its 2xx branch. The transport already rejected
// every non-OK response by throwing, but TypeScript cannot know that — without
// this the success payload type stays unioned with the error shapes.
export function assertOk<T extends { ok: boolean }>(
  _res: T,
): asserts _res is T & { ok: true } {}
