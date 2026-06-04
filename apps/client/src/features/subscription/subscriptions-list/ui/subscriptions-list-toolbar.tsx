import type {
  SortDirection,
  StatusFilter,
  SubscriptionSortField,
} from "@subeye/shared";
import { Link } from "@tanstack/react-router";
import { ArrowRightLeft } from "lucide-react";
import * as React from "react";
import {
  SubscriptionsFilterDrawer,
  SubscriptionsSearch,
} from "@/entities/subscription";
import * as m from "@/i18n/messages";
import { Button } from "@/shared/components";

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
