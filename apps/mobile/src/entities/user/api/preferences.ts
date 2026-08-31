import type { UpdateUserPreferences, UserPreferences } from "@subeye/model";
import { readPreferences, writePreferences } from "@subeye/store";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { dashboardKeys } from "@/entities/dashboard";
import { subscriptionKeys } from "@/entities/subscription";
import { localPorts } from "@/shared/lib/store";

export const preferencesKeys = {
  all: () => ["user", "preferences"] as const,
};

export function preferencesQuery() {
  return queryOptions({
    queryKey: preferencesKeys.all(),
    queryFn: (): Promise<UserPreferences> => readPreferences(localPorts),
  });
}

export function updatePreferences(
  input: UpdateUserPreferences,
): Promise<UserPreferences> {
  return writePreferences(localPorts, input);
}

/**
 * Changing the home currency re-denominates every amount the app derives, so
 * the dashboard and the list are both invalidated. Changing the timezone shifts
 * occurrence boundaries, which moves the same numbers. Invalidating both keys for
 * any preference change is one line and always correct.
 */
export function useUpdatePreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updatePreferences,
    onSuccess: (updated) => {
      client.setQueryData(preferencesKeys.all(), updated);
      void client.invalidateQueries({ queryKey: dashboardKeys.all });
      void client.invalidateQueries({ queryKey: subscriptionKeys.all() });
    },
  });
}
