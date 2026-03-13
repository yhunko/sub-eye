import { FC, useMemo } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { dashboardAnalyticsQuery } from "@/entities/analytics";
import { CurrencyBadge } from "@/entities/currency";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { DateTimezoneUtils } from "shared";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemActions,
  ItemMedia,
} from "@/shared/components";
import { SubscriptionBillingUtils } from "@/features/subscription/billing/lib/subscription-billing-utils";
import { BrandfetchImage } from "@/features/brandfetch";
import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

type UpcomingRenewalsProps = {
  className?: string;
};

export const UpcomingRenewals: FC<UpcomingRenewalsProps> = ({ className }) => {
  const { user } = useUser();
  const { userId } = useAuth();

  const { data } = useSuspenseQuery(
    dashboardAnalyticsQuery({
      params: { userId: userId! },
      options: { enabled: true },
    }),
  );

  const upcomingRenewals = data.upcomingRenewals;
  const timezone =
    (user?.publicMetadata as { preferredTimezone?: string })
      ?.preferredTimezone ?? "UTC";

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

  if (!userId) {
    return (
      <Card className={cn("bg-muted/20 h-full animate-pulse", className)} />
    );
  }

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
        {renewalsWithDisplayState.map((item) => (
          <Item
            key={`${item.id}-${item.nextPaymentDate}`}
            size="sm"
            variant="outline"
            asChild
            className="flex-nowrap"
          >
            <Link
              to="/subscriptions/$id"
              params={{ id: item.id }}
              className="w-full"
            >
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
            </Link>
          </Item>
        ))}
      </CardContent>
    </Card>
  );
};
