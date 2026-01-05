"use client";

import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
} from "@/shared/components";
import { useSubscriptions } from "@/entities/subscription";
import { keepPreviousData } from "@tanstack/react-query";
import * as React from "react";
import { BrandfetchImage } from "../../brandfetch";
import { SubscriptionNextBill } from "./subscription-next-bill";
import { Link } from "@/features/i18n/lib/navigation";
import { ChevronRight } from "lucide-react";

export const SubscriptionsList = () => {
  const { data: subscriptions } = useSubscriptions({
    params: {
      sortBy: "nextPaymentDate",
      direction: "asc",
    },
    options: {
      placeholderData: keepPreviousData,
    },
  });

  return (
    <div className="flex flex-col gap-2">
      {subscriptions?.map((sub) => (
        <Item
          key={sub.id}
          variant="outline"
          size="sm"
          className="w-full"
          asChild
        >
          <Link href={`/subscriptions/${sub.id}`}>
            <ItemMedia>
              <BrandfetchImage domain={sub.brandDomain} />
            </ItemMedia>
            <ItemContent className="gap-0.5">
              <ItemTitle>{sub.name}</ItemTitle>
              <SubscriptionNextBill nextBillDate={sub.nextPaymentDate} />
            </ItemContent>
            <ItemActions>
              <ChevronRight className="size-5" />
            </ItemActions>
          </Link>
        </Item>
      ))}
    </div>
  );
};
