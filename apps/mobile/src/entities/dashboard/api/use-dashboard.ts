import { useQuery } from "@tanstack/react-query";
import { apiClient, assertOk } from "@/shared/api";

export const dashboardKeys = {
  all: ["dashboard"] as const,
};

// GET /api/analytics/dashboard. The transport throws on any non-2xx, so the
// only branch reaching res.json() is the 200 one — assertOk tells TypeScript
// that, keeping the payload type free of the error-response union that Hono RPC
// otherwise leaks into it.
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: async () => {
      const res = await apiClient.api.analytics.dashboard.$get();
      assertOk(res);
      return res.json();
    },
  });
}
