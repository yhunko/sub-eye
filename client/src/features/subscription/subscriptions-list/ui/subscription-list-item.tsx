import { memo } from "react";
import { Repeat } from "lucide-react";
import { BrandfetchImage } from "../../../brandfetch";
import {
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "../../../../shared/components";
import { SubscriptionDto } from "@shared/domains/subscription";
import { SubscriptionNextBill } from "../../billing";
import { CurrencyText } from "../../../../entities/currency";
import { PeriodBadge } from "../../period";
import * as m from "@/i18n/messages";

interface SubscriptionListItemProps {
  subscription: SubscriptionDto;
}

export const SubscriptionListItem = memo(
  ({ subscription }: SubscriptionListItemProps) => {
    return (
      <Item
        asChild
        variant="outline"
        size="sm"
        className="hover:bg-accent/50 rounded-lg"
      >
        <a href={`/subscriptions/${subscription.id}`} className="w-full">
          <ItemMedia variant="image" className="size-12 rounded-full">
            <BrandfetchImage
              domain={subscription.brandDomain}
              className="size-10"
            />
          </ItemMedia>

          <ItemContent className="min-w-0 gap-1">
            <ItemTitle className="truncate text-base font-semibold">
              {subscription.name}
            </ItemTitle>
            <div className="text-muted-foreground flex items-center gap-1 text-sm">
              <span>{m.subscription_date_renewal()}</span>
              <SubscriptionNextBill
                nextBillDate={subscription.nextPaymentDate}
                format="short"
              />
            </div>
          </ItemContent>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-baseline text-base">
              <CurrencyText
                amount={subscription.billing.preferred.amount}
                currencyCode={subscription.billing.preferred.currencyCode}
              />
            </div>
            <div className="text-muted-foreground flex items-center gap-1 text-sm">
              <PeriodBadge
                every={subscription.every}
                period={subscription.period}
              />
              <Repeat className="size-3.5" />
            </div>
          </div>
        </a>
      </Item>
    );
  },
);

SubscriptionListItem.displayName = "SubscriptionListItem";
