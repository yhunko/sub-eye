import { useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { subscriptionsQuery } from "@/entities/subscription";
import { planUsageQuery } from "@/entities/billing";
import {
  comparatorRatesQuery,
  useAnalyzeComparator,
  useCompareSubscriptions,
} from "@/entities/comparator";
import type { SelectableSubscriptionOption } from "../ui/wizard/subscription-comparator-wizard.types";

export const useComparatorQueries = (prefillSubscriptionId?: string) => {
  const { userId } = useAuth();
  const enabled = Boolean(userId);

  const { data: subscriptions = [] } = useQuery(
    subscriptionsQuery({
      params: { userId: userId ?? "", queryParams: { status: "all" } },
      options: { enabled },
    }),
  );

  const { data: usage } = useQuery(
    planUsageQuery({
      params: { userId: userId ?? "" },
      options: { enabled },
    }),
  );

  const { data: ratesFromQuery } = useQuery(
    comparatorRatesQuery({
      params: { userId: userId ?? "" },
      options: { enabled },
    }),
  );

  const compareMutation = useCompareSubscriptions();
  const analyzeMutation = useAnalyzeComparator();

  const selectableSubscriptions = useMemo(() => {
    const filtered = subscriptions.filter(
      (s) =>
        s.status === "active" ||
        s.status === "cancelledButActive" ||
        s.id === prefillSubscriptionId,
    );

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [subscriptions, prefillSubscriptionId]);

  const selectableSubscriptionOptions = useMemo<SelectableSubscriptionOption[]>(
    () => selectableSubscriptions.map(({ id, name }) => ({ id, name })),
    [selectableSubscriptions],
  );

  return {
    subscriptions: selectableSubscriptions,
    selectableSubscriptionOptions,
    usage,
    ratesFromQuery,
    compareMutation,
    analyzeMutation,
  };
};
