import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { reportError } from "./sentry";

/**
 * A domain error carrying a 4xx status is expected, not a bug: 404 is a row
 * deleted from another screen, 400 a transition the form already explains. The
 * use-cases in @subeye/store put that code on a `status` field, so this reads
 * the shape rather than the class.
 */
const isExpected = (error: unknown): boolean => {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  return typeof status === "number" && status < 500;
};

// THE BLIND SPOT SENTRY WOULD OTHERWISE HAVE. Query catches every error a
// queryFn or a mutation throws, so none of them reaches the error boundary or a
// global handler — the screen renders its error state and the cause is never
// seen again. Nearly every screen in the app loads through Query, so without
// this the reporting covers render crashes and almost nothing else.
const reportUnexpected = (
  error: unknown,
  source: "query" | "mutation",
): void => {
  if (isExpected(error)) return;
  reportError(error, { source });
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => reportUnexpected(error, "query"),
  }),
  mutationCache: new MutationCache({
    onError: (error) => reportUnexpected(error, "mutation"),
  }),
  defaultOptions: {
    queries: {
      // The store IS the cache. Every read is a synchronous MMKV parse behind an
      // async use-case, so there is nothing to go stale against and nothing to
      // retry — a failed read is a bug, and repeating it just delays the report.
      staleTime: 0,
    },
  },
});

/**
 * Drop everything Query holds and repaint whatever is on screen. The store
 * document itself is erased separately, and before this.
 *
 * `resetQueries`, NOT `clear()`. Clearing REMOVES each query, and a mounted
 * observer goes on rendering the data of the query that was removed under it
 * until something else re-renders it. That was invisible while this only ran on
 * sign-out, because the redirect to /sign-in unmounted the whole tab tree a
 * frame later; with no auth left, "Erase all data" leaves every screen mounted
 * and the erased numbers stayed on Home until the next cold start.
 */
export function resetQueryCache(): Promise<void> {
  return queryClient.resetQueries();
}
