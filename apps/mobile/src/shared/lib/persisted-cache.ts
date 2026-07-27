import type { DehydratedState } from "@tanstack/react-query";

/**
 * The key `createAsyncStoragePersister` writes under by default. Reused
 * verbatim rather than renamed so an existing install's cache still loads.
 */
export const CACHE_KEY = "REACT_QUERY_OFFLINE_CACHE";

type PersistedClient = {
  timestamp?: unknown;
  buster?: unknown;
  clientState?: DehydratedState;
};

/**
 * The synchronous half of TanStack's `persistQueryClientRestore`: same
 * expiry/buster rules, no promise.
 *
 * It exists because the async version runs inside a `useEffect`, so it does not
 * even start until after React has committed the first frame — which is a frame
 * where every query is empty and the screens render a spinner. MMKV is
 * synchronous, so the cache can simply be in place before the first render.
 */
export function readPersistedCache(
  raw: string | null,
  options: { now: number; buster: string; maxAge: number },
): DehydratedState | null {
  if (!raw) return null;

  let persisted: PersistedClient;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    persisted = parsed as PersistedClient;
  } catch {
    // A half-written blob must not take the app down at module load, where
    // there is no error boundary yet. Treat it as a cold cache.
    return null;
  }

  // No timestamp means the age cannot be checked, so the payload is unusable —
  // same call TanStack makes.
  if (typeof persisted.timestamp !== "number") return null;
  if (options.now - persisted.timestamp > options.maxAge) return null;
  if (persisted.buster !== options.buster) return null;

  return persisted.clientState ?? null;
}
