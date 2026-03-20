import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/shared/api/api-error";
import { posthog } from "@/shared/lib/analytics/posthog";
import * as m from "@/i18n/messages";
import { router } from "../../router";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20 * 1000, // Keep data fresh while still smoothing rapid route changes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      onError(error) {
        posthog.captureException(error, {
          release: import.meta.env.APP_VERSION,
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
