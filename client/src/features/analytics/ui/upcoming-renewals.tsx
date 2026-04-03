import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { type FC, useMemo } from "react";
import type { UpcomingRenewalDto } from "shared";
import { DateTimezoneUtils } from "shared";
import { CurrencyBadge } from "@/entities/currency";
import { BrandfetchImage } from "@/features/brandfetch";
import { SubscriptionBillingUtils } from "@/features/subscription/billing/lib/subscription-billing-utils";
import * as m from "@/i18n/messages";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/shared/components";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/classes-utils";

type UpcomingRenewalsProps = {
  upcomingRenewals: UpcomingRenewalDto[];
  timezone: string;
  disableLinks?: boolean;
  className?: string;
};

export const UpcomingRenewals: FC<UpcomingRenewalsProps> = ({
  upcomingRenewals,
  timezone,
  disableLinks = false,
  className,
}) => {
  const renewalsWithDisplayState = useMemo(() => {
    if (!upcomingRenewals) return [];

    return upcomingRenewals.map((item) => {
      const zonedDate = DateTimezoneUtils.toZoned(
        item.nextPaymentDate,
        timezone,
      );
      const displayState = SubscriptionBillingUtils.toDisplayState(
        zonedDate,
        timezone,
      );
      return {
        ...item,
        displayState,
      };
    });
  }, [upcomingRenewals, timezone]);

  if (!renewalsWithDisplayState.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{m.analytics_upcomingRenewals_title()}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {m.analytics_upcomingRenewals_noUpcoming()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{m.analytics_upcomingRenewals_title()}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {renewalsWithDisplayState.map((item) => {
          const content = (
            <>
              <ItemMedia>
                <BrandfetchImage domain={item.brandDomain} />
              </ItemMedia>
              <ItemContent className="min-w-0">
                <ItemTitle className="w-full truncate">{item.name}</ItemTitle>
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-xs",
                      item.displayState.colorClass,
                    )}
                  >
                    <span className="whitespace-nowrap">
                      {item.displayState.relativeText}
                    </span>
                  </div>
                  <CurrencyBadge
                    amount={item.amount}
                    currencyCode={item.currencyCode}
                  />
                </div>
              </ItemContent>
              <ItemActions className="shrink-0">
                <ChevronRight className="size-4" />
              </ItemActions>
            </>
          );

          return (
            <Item
              key={`${item.id}-${item.nextPaymentDate}`}
              size="sm"
              variant="outline"
              asChild
              className="flex-nowrap"
            >
              {disableLinks ? (
                <div className="w-full">{content}</div>
              ) : (
                <Link
                  to="/subscriptions/$id"
                  params={{ id: item.id }}
                  className="w-full"
                >
                  {content}
                </Link>
              )}
            </Item>
          );
        })}
      </CardContent>
    </Card>
  );
};
