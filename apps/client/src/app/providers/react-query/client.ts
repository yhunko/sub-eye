import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as m from "@/i18n/messages";
import { ApiError } from "@/shared/api/api-error";
import { posthog } from "@/shared/lib/analytics/posthog";
import { router } from "../../router";

const queryCache = new QueryCache({
  onError(error) {
    posthog.captureException(error, {
      extra: {
        error_type: "query",
        status: error instanceof ApiError ? error.status : undefined,
        route: window.location.pathname,
        release: import.meta.env.APP_VERSION,
      },
    });
  },
});

export const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      onError(error) {
        posthog.captureException(error, {
          extra: {
            error_type: "mutation",
            status: error instanceof ApiError ? error.status : undefined,
            route: window.location.pathname,
            release: import.meta.env.APP_VERSION,
          },
        });

        if (error instanceof ApiError && error.status === 401) {
          toast.warning(m.error_session_expired());
          void router.navigate({ to: "/auth/sign-in/$" });
          return;
        }

        toast.error(error?.message ?? m.messages_error());
      },
    },
  },
});
