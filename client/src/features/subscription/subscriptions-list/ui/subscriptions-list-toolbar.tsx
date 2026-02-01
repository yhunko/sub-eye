import * as React from "react";
import {
  SubscriptionsSearch,
  SubscriptionsFilter,
} from "@/entities/subscription";
import type {
  SubscriptionSortField,
  SortDirection,
} from "@shared/domains/subscription";
import * as m from "@/i18n/messages";

interface SubscriptionsListToolbarProps {
  loading?: boolean;
  sortBy: SubscriptionSortField;
  onSortChange: (
    sortBy: SubscriptionSortField,
    direction: SortDirection,
  ) => void;
}

export const SubscriptionsListToolbar = React.memo(
  ({ loading, sortBy, onSortChange }: SubscriptionsListToolbarProps) => {
    return (
      <div className="flex h-full items-center gap-2">
        <SubscriptionsSearch
          placeholder={m.common_placeholders_search()}
          className="flex-1 shrink-0"
          loading={loading}
        />
        <SubscriptionsFilter sortBy={sortBy} onSortChange={onSortChange} />
      </div>
    );
  },
);

SubscriptionsListToolbar.displayName = "SubscriptionsListToolbar";
