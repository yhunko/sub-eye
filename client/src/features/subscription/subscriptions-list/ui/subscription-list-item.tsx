import { MiddleTruncate } from "@re-dev/react-truncate";
import { Link } from "@tanstack/react-router";
import { Repeat } from "lucide-react";
import { memo } from "react";
import type { SubscriptionDto } from "shared";
import { cn } from "@/shared/lib/classes-utils";
import { CurrencyText } from "../../../../entities/currency";
import {
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "../../../../shared/components";
import { BrandfetchImage } from "../../../brandfetch";
import { PeriodBadge } from "../../period";
import { SubscriptionListStatus } from "./subscription-list-status";

interface SubscriptionListItemProps {
  subscription: SubscriptionDto;
  disableLink?: boolean;
}

export const SubscriptionListItem = memo(
  ({ subscription, disableLink = false }: SubscriptionListItemProps) => {
    const isCancelled = subscription.status === "cancelled";
    const isCancelledButActive = subscription.status === "cancelledButActive";

    const content = (
      <>
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
              "w-full max-w-xs truncate text-base font-semibold",
              isCancelled &&
                "text-muted-foreground decoration-border line-through",
            )}
          >
            <MiddleTruncate>{subscription.name}</MiddleTruncate>
          </ItemTitle>
          <SubscriptionListStatus subscription={subscription} />
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
      </>
    );

    return (
      <Item
        asChild
        variant="outline"
        size="sm"
        className={cn(
          "hover:bg-accent/50 rounded-lg",
          isCancelled && "bg-muted/30 opacity-75",
          isCancelledButActive && "border-amber-500/40 bg-amber-500/5",
        )}
      >
        {disableLink ? (
          <div className="w-full">{content}</div>
        ) : (
          <Link
            to="/subscriptions/$id"
            params={{ id: subscription.id }}
            className="w-full"
          >
            {content}
          </Link>
        )}
      </Item>
    );
  },
);

SubscriptionListItem.displayName = "SubscriptionListItem";
