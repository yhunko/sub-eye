import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  SubscriptionsSearch,
  SubscriptionsFilterDrawer,
} from "@/entities/subscription";
import { Button } from "@/shared/components";
import type {
  SubscriptionSortField,
  SortDirection,
  StatusFilter,
} from "shared";
import * as m from "@/i18n/messages";
import { ArrowRightLeft } from "lucide-react";

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
        <Button
          variant="outline"
          size="icon"
          asChild
          aria-label={m.comparator_action_open()}
        >
          <Link to="/subscriptions/compare">
            <ArrowRightLeft className="size-4" />
            <span className="sr-only">{m.comparator_action_open()}</span>
          </Link>
        </Button>
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
