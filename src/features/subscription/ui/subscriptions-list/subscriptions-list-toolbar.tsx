"use client";

import * as React from "react";
import { SubscriptionsFilter } from "./subscriptions-filter";
import { SubscriptionsSearch } from "../subscriptions-search";
import { useTranslations } from "next-intl";

interface SubscriptionsListToolbarProps {
  loading?: boolean;
}

export const SubscriptionsListToolbar = React.memo(
  ({ loading }: SubscriptionsListToolbarProps) => {
    const tCommon = useTranslations("common");

    return (
      <div className="flex h-full items-center gap-2">
        <SubscriptionsSearch
          placeholder={tCommon("placeholders.search")}
          className="flex-1 shrink-0"
          loading={loading}
        />
        <SubscriptionsFilter />
      </div>
    );
  },
);

SubscriptionsListToolbar.displayName = "SubscriptionsListToolbar";
