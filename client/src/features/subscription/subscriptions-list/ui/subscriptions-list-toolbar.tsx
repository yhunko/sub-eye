import * as React from "react";
import {
  SubscriptionsSearch,
  SubscriptionsFilterDrawer,
} from "@/entities/subscription";
import type {
  SubscriptionSortField,
  SortDirection,
  StatusFilter,
} from "@shared/domains/subscription";
import * as m from "@/i18n/messages";

interface SubscriptionsListToolbarProps {
  loading?: boolean;
  sortBy: SubscriptionSortField;
  direction: SortDirection;
  status: StatusFilter;
  onSortChange: (
    sortBy: SubscriptionSortField,
    direction: SortDirection,
  ) => void;
  onStatusChange: (status: StatusFilter) => void;
}

export const SubscriptionsListToolbar = React.memo(
  ({
    loading,
    sortBy,
    direction,
    status,
    onSortChange,
    onStatusChange,
  }: SubscriptionsListToolbarProps) => {
    return (
      <div className="flex h-full items-center gap-2">
        <SubscriptionsSearch
          placeholder={m.common_placeholders_search()}
          className="flex-1 shrink-0"
          loading={loading}
        />
        <SubscriptionsFilterDrawer
          sortBy={sortBy}
          direction={direction}
          status={status}
          onSortChange={onSortChange}
          onStatusChange={onStatusChange}
        />
      </div>
    );
  },
);

SubscriptionsListToolbar.displayName = "SubscriptionsListToolbar";
