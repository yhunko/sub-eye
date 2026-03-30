import { ReactNode, FC } from "react";
import { useQueryStates } from "nuqs";
import {
  subscriptionsQueryParsers,
  CategoryFilterChips,
} from "@/entities/subscription";
import { SubscriptionsList } from "./ui/subscriptions-list";
import { SubscriptionsListToolbar } from "./ui/subscriptions-list-toolbar";
import type { SubscriptionDto, CategoryDto } from "shared";

type SubscriptionsListWidgetProps = {
  subscriptions: SubscriptionDto[];
  categories: CategoryDto[];
  isLoading?: boolean;
  monthlySpendSlot?: ReactNode;
  disableLinks?: boolean;
};

const SubscriptionsListWidget: FC<SubscriptionsListWidgetProps> = ({
  subscriptions,
  categories,
  isLoading,
  monthlySpendSlot,
  disableLinks = false,
}) => {
  const [filters, setFilters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });

  const { sortBy, direction, status, categoryId } = filters;

  const isEmpty = !isLoading && subscriptions.length === 0;

  return (
    <div className="flex min-h-full flex-col gap-4 pb-6">
      {monthlySpendSlot && (
        <div className="flex flex-col gap-1">{monthlySpendSlot}</div>
      )}

      <CategoryFilterChips
        value={categoryId}
        onChange={(id) => void setFilters({ categoryId: id })}
        categories={categories}
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
      <SubscriptionsList
        subscriptions={subscriptions}
        empty={isEmpty}
        disableLinks={disableLinks}
      />
    </div>
  );
};

export default SubscriptionsListWidget;
