import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { useCallback, useMemo } from "react";
import {
  type ComparatorWizardPersistentState,
  restoreComparatorWizardPersistentState,
  SubscriptionComparatorWizard,
  serializeComparatorWizardPersistentState,
} from "@/features/subscription/comparator";
import { subscriptionComparatorSearchSchema } from "@/shared/lib/router/subscription-comparator-search";
import { SubscriptionNativeLayout } from "@/widgets/subscription-native-layout";

export const Route = createFileRoute("/(protected)/subscriptions/compare")({
  component: SubscriptionComparatorPage,
  validateSearch: valibotValidator(subscriptionComparatorSearchSchema),
});

function SubscriptionComparatorPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const persistedState = useMemo(
    () =>
      restoreComparatorWizardPersistentState({
        draft: search.draft,
        prefillSubscriptionId: search.prefillId,
      }),
    [search.draft, search.prefillId],
  );

  const handlePersistedStateChange = useCallback(
    (state: ComparatorWizardPersistentState) => {
      const draft = serializeComparatorWizardPersistentState({
        state,
        prefillSubscriptionId: search.prefillId,
      });

      if (draft === search.draft || (!draft && !search.draft)) {
        return;
      }

      void navigate({
        to: "/subscriptions/compare",
        search: (previousSearch) => ({
          ...previousSearch,
          draft: draft ?? undefined,
        }),
        replace: true,
        resetScroll: false,
      });
    },
    [navigate, search.draft, search.prefillId],
  );

  return (
    <SubscriptionNativeLayout
      surface="plain"
      mainClassName="max-w-7xl md:px-8"
      contentClassName="max-w-6xl"
    >
      <SubscriptionComparatorWizard
        key={search.prefillId ?? "manual"}
        prefillSubscriptionId={search.prefillId}
        persistedState={persistedState}
        onPersistedStateChange={handlePersistedStateChange}
      />
    </SubscriptionNativeLayout>
  );
}
