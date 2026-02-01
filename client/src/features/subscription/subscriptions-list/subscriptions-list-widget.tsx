import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import {
  subscriptionsQueryParsers,
  subscriptionsQuery,
} from "@/entities/subscription";
import { SubscriptionsList } from "./ui/subscriptions-list";
import { SubscriptionsListToolbar } from "./ui/subscriptions-list-toolbar";
import { useAuth } from "@clerk/clerk-react";

const SubscriptionsListWidget = () => {
  const [filters, setFilters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });

  const { search, sortBy, direction } = filters;

  const queryParams = useMemo(() => {
    const trimmedSearch = search.trim();

    return {
      sortBy,
      direction,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
    };
  }, [direction, search, sortBy]);

  const { userId } = useAuth();
  const {
    data: subscriptions,
    isLoading,
    isSuccess,
  } = useQuery(
    subscriptionsQuery({
      params: {
        userId: userId!,
        queryParams,
      },
      options: {
        placeholderData: keepPreviousData,
      },
    }),
  );

  const isEmpty = isSuccess && subscriptions?.length === 0;

  return (
    <div className="flex min-h-full flex-col gap-4 pb-6">
      <SubscriptionsListToolbar
        loading={isLoading}
        sortBy={sortBy}
        onSortChange={(newSortBy, newDirection) => {
          void setFilters({ sortBy: newSortBy, direction: newDirection });
        }}
      />
      <SubscriptionsList subscriptions={subscriptions ?? []} empty={isEmpty} />
    </div>
  );
};

export default SubscriptionsListWidget;
