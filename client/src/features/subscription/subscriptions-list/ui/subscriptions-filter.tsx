import { Check, ListFilter } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../../../../shared/components";
import { cn } from "../../../../shared/lib/classes-utils";
import {
  SubscriptionSortField,
  SortDirection,
} from "@shared/domains/subscription";
import * as m from "@/i18n/messages";

const sortDirectionMap: Record<SubscriptionSortField, SortDirection> = {
  nextPaymentDate: "asc",
  name: "asc",
  cost: "desc",
};

const sortLabelMap: Record<SubscriptionSortField, () => string> = {
  nextPaymentDate: m.subscription_filter_sort_renewal,
  name: m.subscription_filter_sort_name,
  cost: m.subscription_filter_sort_cost,
};

const sortOptions: SubscriptionSortField[] = [
  "nextPaymentDate",
  "name",
  "cost",
];

interface SubscriptionsFilterProps {
  sortBy: SubscriptionSortField;
  onSortChange: (
    sortBy: SubscriptionSortField,
    direction: SortDirection,
  ) => void;
}

export const SubscriptionsFilter = ({
  sortBy,
  onSortChange,
}: SubscriptionsFilterProps) => {
  const handleSortChange = (nextSortBy: SubscriptionSortField) => {
    onSortChange(nextSortBy, sortDirectionMap[nextSortBy]);
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
          <span className="sr-only">{m.common_actions_filter()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          {m.subscription_filter_sortBy()}
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option}
              onClick={() => handleSortChange(option)}
              className="cursor-pointer"
            >
              <Check
                className={cn(
                  "mr-2 size-4",
                  sortBy === option ? "opacity-100" : "opacity-0",
                )}
              />
              {sortLabelMap[option]()}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
