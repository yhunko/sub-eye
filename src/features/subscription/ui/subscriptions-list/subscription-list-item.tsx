"use client";

import * as React from "react";
import Link from "next/link";
import { Repeat } from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandfetchImage } from "@/features/brandfetch";
import { CurrencyText } from "@/features/currency";
import { SubscriptionDto } from "@/entities/subscription";
import { PeriodBadge } from "../period-badge";
import { SubscriptionNextBill } from "../subscription-next-bill";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/shared/components";

interface SubscriptionListItemProps {
  subscription: SubscriptionDto;
}

export const SubscriptionListItem = React.memo(
  ({ subscription }: SubscriptionListItemProps) => {
    const t = useTranslations("subscription.date");

    return (
      <Item
        asChild
        variant="outline"
        size="sm"
        className="hover:bg-accent/50 rounded-lg"
      >
        <Link href={`/subscriptions/${subscription.id}`} className="w-full">
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
              <span>{t("renewal")}</span>
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
        </Link>
      </Item>
    );
  },
);

SubscriptionListItem.displayName = "SubscriptionListItem";
