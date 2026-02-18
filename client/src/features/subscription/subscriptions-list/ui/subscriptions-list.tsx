import * as React from "react";
import { SubscriptionListItem } from "./subscription-list-item";
import {
  ItemGroup,
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyMedia,
} from "../../../../shared/components";
import { ListX } from "lucide-react";
import { SubscriptionDto } from "shared";
import * as m from "@/i18n/messages";

interface SubscriptionsListSectionProps {
  subscriptions: SubscriptionDto[];
  empty?: boolean;
}

export const SubscriptionsList = React.memo(
  ({ subscriptions, empty }: SubscriptionsListSectionProps) => {
    return (
      <ItemGroup className="gap-2">
        {empty && (
          <Empty key="empty">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListX />
              </EmptyMedia>
              <EmptyTitle>{m.subscription_empty_title()}</EmptyTitle>
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

SubscriptionsList.displayName = "SubscriptionsListSection";
