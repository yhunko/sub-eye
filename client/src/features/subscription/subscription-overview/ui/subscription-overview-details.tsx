import { FC } from "react";
import { cn } from "@/shared/lib/classes-utils";
import { CalendarClock, CalendarSync, RotateCw } from "lucide-react";
import { format } from "date-fns";
import {
  ItemGroup,
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/shared/components";
import { PeriodBadge } from "@/features/subscription/period";
import * as m from "@/i18n/messages";
import type { BillDisplayState } from "../../billing/lib/subscription-billing-utils";
import { SubscriptionDto } from "@shared/domains/subscription";

type SubscriptionOverviewDetailsProps = {
  subscription: SubscriptionDto;
  displayState: BillDisplayState | null;
};

export const SubscriptionOverviewDetails: FC<
  SubscriptionOverviewDetailsProps
> = ({ subscription, displayState }) => {
  const isCancelled = !!subscription.cancelledAt;

  return (
    <ItemGroup className="flex flex-col gap-2 md:gap-5">
      <Item variant="muted" size="sm">
        <ItemMedia variant="icon">
          <CalendarSync
            className={cn(isCancelled && "text-muted-foreground")}
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            {isCancelled
              ? m.subscription_details_endsOn()
              : m.subscription_overview_nextPayment()}
          </ItemTitle>
          <ItemDescription>
            {isCancelled ? (
              <span className="text-muted-foreground">
                {displayState?.formattedDate}
              </span>
            ) : (
              <>
                <span>{displayState?.formattedDate}</span>
                &nbsp;(
                <span className={displayState?.colorClass}>
                  {displayState?.relativeText}
                </span>
                )
              </>
            )}
          </ItemDescription>
        </ItemContent>
      </Item>

      <Item variant="muted" size="sm">
        <ItemMedia variant="icon">
          <RotateCw />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{m.subscription_table_column_period()}</ItemTitle>
          <ItemDescription>
            <PeriodBadge
              every={subscription.every}
              period={subscription.period}
            />
          </ItemDescription>
        </ItemContent>
      </Item>

      {subscription.lastPaymentDate && (
        <Item variant="muted" size="sm">
          <ItemMedia variant="icon">
            <CalendarClock />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{m.subscription_overview_previousPayment()}</ItemTitle>
            <ItemDescription>
              {format(new Date(subscription.lastPaymentDate), "dd MMMM yyyy")}
            </ItemDescription>
          </ItemContent>
        </Item>
      )}
    </ItemGroup>
  );
};
