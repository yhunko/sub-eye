import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
        toast.error(error?.message);
      },
    },
  },
});
