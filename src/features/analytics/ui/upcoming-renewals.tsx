"use client";

import { useDashboardAnalytics } from "@/entities/analytics/api/hooks";
import { CurrencyBadge } from "@/features/currency/ui/currency-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";
import { FC } from "react";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemActions,
  ItemMedia,
} from "@/shared/components";
import { BrandfetchImage } from "../../brandfetch";

type UpcomingRenewalsProps = {
  className?: string;
};

export const UpcomingRenewals: FC<UpcomingRenewalsProps> = ({ className }) => {
  const { data, isLoading } = useDashboardAnalytics();

  if (isLoading) {
    return (
      <Card className={cn("bg-muted/20 h-[200px] animate-pulse", className)} />
    );
  }

  if (!data?.upcomingRenewals.length) {
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
      <CardContent className="flex flex-col gap-4">
        {data.upcomingRenewals.map((item) => (
          <Item key={item.id} size="sm" variant="muted">
            <ItemMedia>
              <BrandfetchImage domain={item.brandDomain} />
            </ItemMedia>

            <ItemContent>
              <ItemTitle>{item.name}</ItemTitle>
            </ItemContent>

            <ItemActions>
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <span>in {item.daysUntil} days</span>
              </div>
              <CurrencyBadge
                amount={item.amount}
                currencyCode={item.currencyCode}
                // className="w-[60px] justify-end text-sm font-semibold"
              />
            </ItemActions>
          </Item>
        ))}
      </CardContent>
    </Card>
  );
};
