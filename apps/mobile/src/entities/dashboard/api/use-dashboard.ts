import { buildDashboard } from "@subeye/store";
import { useQuery } from "@tanstack/react-query";
import { localPorts } from "@/shared/lib/store";

export const dashboardKeys = {
  all: ["dashboard"] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: () => buildDashboard(localPorts),
  });
}
