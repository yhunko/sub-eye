import type { UpdateUserPreferences, UserPreferences } from "@subeye/shared";
import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { dashboardKeys } from "@/entities/dashboard";
import { subscriptionKeys } from "@/entities/subscription";
import { apiClient, assertOk } from "@/shared/api";

export const preferencesKeys = {
  all: () => ["user", "preferences"] as const,
};

export function preferencesQuery() {
  return queryOptions({
    queryKey: preferencesKeys.all(),
    queryFn: async (): Promise<UserPreferences> => {
      const response = await apiClient.api.user.preferences.$get();
      assertOk(response);
      return response.json();
    },
    // Preferences change roughly never. Keeping them fresh for an hour means the
    // Settings tab opens without a spinner on every visit.
    staleTime: 60 * 60 * 1000,
  });
}

export async function updatePreferences(
  input: UpdateUserPreferences,
): Promise<UserPreferences> {
  const response = await apiClient.api.user.preferences.$patch({ json: input });
  assertOk(response);
  return response.json();
}

/**
 * Changing the home currency re-denominates every amount the server returns, so
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
