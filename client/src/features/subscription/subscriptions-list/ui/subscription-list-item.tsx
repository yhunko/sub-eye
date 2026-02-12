import { memo } from "react";
import { Link } from "@tanstack/react-router";
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
import { cn } from "@/shared/lib/classes-utils";

interface SubscriptionListItemProps {
  subscription: SubscriptionDto;
}

export const SubscriptionListItem = memo(
  ({ subscription }: SubscriptionListItemProps) => {
    const isCancelled = !!subscription.cancelledAt;

    return (
      <Item
        asChild
        variant="outline"
        size="sm"
        className={cn(
          "hover:bg-accent/50 rounded-lg",
          isCancelled && "bg-muted/30 opacity-75",
        )}
      >
        <Link
          to="/subscriptions/$id"
          params={{ id: subscription.id }}
          className="w-full"
        >
          <ItemMedia
            variant="image"
            className={cn("size-12 rounded-full", isCancelled && "grayscale")}
          >
            <BrandfetchImage
              domain={subscription.brandDomain}
              className="size-10"
            />
          </ItemMedia>

          <ItemContent className="min-w-0 gap-1">
            <ItemTitle
              className={cn(
                "truncate text-base font-semibold",
                isCancelled &&
                  "text-muted-foreground decoration-border line-through",
              )}
            >
              {subscription.name}
            </ItemTitle>
            <div className="text-muted-foreground flex items-center gap-1 text-sm">
              {isCancelled ? (
                <span className="text-destructive font-medium">
                  {m.subscription_status_cancelled()}
                </span>
              ) : (
                <>
                  <span>{m.subscription_date_renewal()}</span>
                  <SubscriptionNextBill
                    nextBillDate={subscription.nextPaymentDate}
                    format="short"
                  />
                </>
              )}
            </div>
          </ItemContent>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-baseline text-base">
              <CurrencyText
                amount={subscription.billing.preferred.amount}
                currencyCode={subscription.billing.preferred.currencyCode}
                className={cn(isCancelled && "text-muted-foreground")}
              />
            </div>
            <div className="text-muted-foreground flex items-center gap-1 text-sm">
              <PeriodBadge
                every={subscription.every}
                period={subscription.period}
                className={cn(isCancelled && "opacity-50")}
              />
              <Repeat className="size-3.5" />
            </div>
          </div>
        </Link>
      </Item>
    );
  },
);

SubscriptionListItem.displayName = "SubscriptionListItem";
