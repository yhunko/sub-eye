import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import {
  subscriptionsQueryParsers,
  subscriptionsQuery,
  CategoryFilterChips,
} from "@/entities/subscription";
import { SubscriptionsList } from "./ui/subscriptions-list";
import { SubscriptionsListToolbar } from "./ui/subscriptions-list-toolbar";
import { useAuth } from "@clerk/clerk-react";
import { SubscriptionsMonthlySpendCard } from "../../analytics";

const SubscriptionsListWidget = () => {
  const [filters, setFilters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });

  const { search, sortBy, direction, status, categoryId } = filters;

  const queryParams = useMemo(() => {
    const trimmedSearch = search.trim();

    return {
      sortBy,
      direction,
      status,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
      ...(categoryId ? { categoryId } : {}),
    };
  }, [direction, search, sortBy, status, categoryId]);

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
      <div className="flex flex-col gap-1">
        <SubscriptionsMonthlySpendCard />
      </div>

      <CategoryFilterChips
        value={categoryId}
        onChange={(id) => void setFilters({ categoryId: id })}
      />

      <SubscriptionsListToolbar
        loading={isLoading}
        sortBy={sortBy}
        direction={direction}
        status={status}
        onSortChange={(newSortBy, newDirection) => {
          void setFilters({ sortBy: newSortBy, direction: newDirection });
        }}
        onStatusChange={(newStatus) => {
          void setFilters({ status: newStatus });
        }}
      />
      <SubscriptionsList subscriptions={subscriptions ?? []} empty={isEmpty} />
    </div>
  );
};

export default SubscriptionsListWidget;
