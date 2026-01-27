"use client";

import * as React from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useSubscriptions } from "@/entities/subscription";
import { SubscriptionsListWidget } from "./subscriptions-list-widget";
import { SubscriptionsListToolbar } from "./subscriptions-list-toolbar";
import { subscriptionsQueryParsers } from "../../lib/subscriptions-query";
import { SubscriptionsMonthlySpendCard } from "../subscriptions-monthly-spend-card";

export const SubscriptionsList = () => {
  const [filters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });

  const { search, sortBy, direction } = filters;

  const queryParams = React.useMemo(() => {
    const trimmedSearch = search.trim();

    return {
      sortBy,
      direction,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
    };
  }, [direction, search, sortBy]);

  const {
    data: subscriptions,
    isLoading,
    isPlaceholderData,
    isSuccess,
  } = useSubscriptions({
    params: queryParams,
    options: {
      placeholderData: keepPreviousData,
    },
  });

  const isEmpty = isSuccess && subscriptions?.length === 0;

  return (
    <div className="flex min-h-full flex-col gap-4 pb-6">
      <SubscriptionsMonthlySpendCard />
      <SubscriptionsListToolbar loading={isLoading || isPlaceholderData} />
      <SubscriptionsListWidget
        subscriptions={subscriptions ?? []}
        empty={isEmpty}
      />
    </div>
  );
};
