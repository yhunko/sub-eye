"use client";

import * as React from "react";
import { SubscriptionDto } from "@/entities/subscription";
import { SubscriptionListItem } from "./subscription-list-item";
import {
  ItemGroup,
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyMedia,
} from "@/shared/components";
import { ListX } from "lucide-react";
import { useTranslations } from "next-intl";

interface SubscriptionsListSectionProps {
  subscriptions: SubscriptionDto[];
  empty?: boolean;
}

export const SubscriptionsListWidget = React.memo(
  ({ subscriptions, empty }: SubscriptionsListSectionProps) => {
    const t = useTranslations("subscription.empty");

    return (
      <ItemGroup className="gap-2">
        {empty && (
          <Empty key="empty">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListX />
              </EmptyMedia>
              <EmptyTitle>{t("title")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
        {subscriptions.map((subscription) => (
          <SubscriptionListItem
            key={subscription.id}
            subscription={subscription}
          />
        ))}
      </ItemGroup>
    );
  },
);

SubscriptionsListWidget.displayName = "SubscriptionsListSection";
