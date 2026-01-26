"use client";

import { useTranslations } from "next-intl";
import { Check, ListFilter } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components";
import { cn } from "@/shared/lib";
import { SubscriptionSortField, SortDirection } from "@/entities/subscription";
import { useQueryStates } from "nuqs";
import { subscriptionsQueryParsers } from "../../lib/subscriptions-query";

const sortDirectionMap: Record<SubscriptionSortField, SortDirection> = {
  nextPaymentDate: "asc",
  name: "asc",
  cost: "desc",
};

const sortOptions: Array<{
  value: SubscriptionSortField;
  labelKey: "renewal" | "name" | "cost";
}> = [
  { value: "nextPaymentDate", labelKey: "renewal" },
  { value: "name", labelKey: "name" },
  { value: "cost", labelKey: "cost" },
];

export const SubscriptionsFilter = () => {
  const t = useTranslations("subscription.filter");
  const tCommon = useTranslations("common");

  const [{ sortBy }, setFilters] = useQueryStates(subscriptionsQueryParsers, {
    history: "replace",
  });

  const onSortChange = (nextSortBy: SubscriptionSortField) => {
    void setFilters({
      sortBy: nextSortBy,
      direction: sortDirectionMap[nextSortBy],
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-xl"
        >
          <ListFilter className="size-5" />
          <span className="sr-only">{tCommon("actions.filter")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          {t("sortBy")}
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className="cursor-pointer"
            >
              <Check
                className={cn(
                  "mr-2 size-4",
                  sortBy === option.value ? "opacity-100" : "opacity-0",
                )}
              />
              {t(`sort.${option.labelKey}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
