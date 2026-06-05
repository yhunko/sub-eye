import { useAuth } from "@clerk/clerk-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { type FC, lazy, Suspense, useMemo } from "react";
import { categoriesQuery } from "@/entities/category";
import {
  subscriptionsQuery,
  subscriptionsQueryParsers,
} from "@/entities/subscription";
import { SubscriptionsMonthlySpendCardConnected } from "@/features/analytics";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";

const SubscriptionsTable = lazy(
  () => import("../../features/subscription/subscriptions-table"),
);

const SubscriptionsListWidget = lazy(
  () => import("../../features/subscription/subscriptions-list"),
);

export const SubscriptionsWidget: FC = () => {
  const isDesktop = useBreakpoint("md");
  const { userId } = useAuth();
  const { orgId } = useActiveSpace();
  const [filters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });

  const queryParams = useMemo(() => {
    const trimmedSearch = filters.search?.trim();
    return {
      sortBy: filters.sortBy,
      direction: filters.direction,
      status: filters.status,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    };
  }, [filters]);

  const { data: subscriptions = [], isLoading } = useQuery(
    subscriptionsQuery({
      params: { userId: userId!, orgId, queryParams },
      options: { placeholderData: keepPreviousData },
    }),
  );

  const { data: categories = [] } = useQuery(
    categoriesQuery({ params: { userId: userId ?? "", orgId } }),
  );

  const sharedProps = {
    subscriptions,
    categories,
    isLoading,
    monthlySpendSlot: <SubscriptionsMonthlySpendCardConnected />,
  };

  if (isDesktop) {
    return (
      <Suspense>
        <SubscriptionsTable {...sharedProps} />
      </Suspense>
    );
  }
  return (
    <Suspense>
      <SubscriptionsListWidget {...sharedProps} />
    </Suspense>
  );
};
