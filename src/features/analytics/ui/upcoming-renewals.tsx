"use client";

import { FC, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { CurrencyBadge } from "@/features/currency/ui/currency-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn, DateTimezoneUtils } from "@/shared/lib";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemActions,
  ItemMedia,
} from "@/shared/components";
import { SubscriptionUIMapper } from "@/features/subscription/lib/subscription-ui.mapper";
import { BrandfetchImage } from "../../brandfetch";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type UpcomingRenewalsProps = {
  className?: string;
};

export const UpcomingRenewals: FC<UpcomingRenewalsProps> = ({ className }) => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { data, isLoading: isAnalyticsLoading } = useDashboardAnalytics();

  const upcomingRenewals = data?.upcomingRenewals;
  const timezone = user?.publicMetadata?.preferredTimezone;
  const isLoading = !isUserLoaded || isAnalyticsLoading;

  const renewalsWithDisplayState = useMemo(() => {
    if (!upcomingRenewals || !isUserLoaded) return [];

    return upcomingRenewals.map((item) => {
      const zonedDate = DateTimezoneUtils.toZoned(
        item.nextPaymentDate,
        timezone,
      );
      const displayState = SubscriptionUIMapper.toDisplayState(
        zonedDate,
        timezone,
      );

      return {
        ...item,
        displayState,
      };
    });
  }, [upcomingRenewals, isUserLoaded, timezone]);

  if (isLoading) {
    return (
      <Card className={cn("bg-muted/20 h-full animate-pulse", className)} />
    );
  }

  if (!renewalsWithDisplayState.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Upcoming Renewals</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          No upcoming payments in the next 30 days.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Upcoming Renewals</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {renewalsWithDisplayState.map((item) => (
          <Item key={item.id} size="sm" variant="outline" asChild>
            <Link href={`/subscriptions/${item.id}`}>
              <ItemMedia>
                <BrandfetchImage domain={item.brandDomain} />
              </ItemMedia>

              <ItemContent>
                <ItemTitle>{item.name}</ItemTitle>
              </ItemContent>

              <ItemActions>
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    item.displayState.colorClass,
                  )}
                >
                  <span>{item.displayState.relativeText}</span>
                </div>
                <CurrencyBadge
                  amount={item.amount}
                  currencyCode={item.currencyCode}
                />
                <ChevronRight className="size-4" />
              </ItemActions>
            </Link>
          </Item>
        ))}
      </CardContent>
    </Card>
  );
};
