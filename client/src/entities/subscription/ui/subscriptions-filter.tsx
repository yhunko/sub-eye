import { FC } from "react";
import { Check, ListFilter } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { StatusFilter } from "shared";
import * as m from "@/i18n/messages";

interface SubscriptionsFilterProps {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
}

export const SubscriptionsFilter: FC<SubscriptionsFilterProps> = ({
  status,
  onStatusChange,
}) => {
  const statusOptions: { label: () => string; value: StatusFilter }[] = [
    { label: m.subscription_filter_status_active, value: "active" },
    {
      label: m.subscription_status_cancelledButActive,
      value: "cancelledButActive",
    },
    { label: m.subscription_status_cancelled, value: "cancelled" },
    { label: m.subscription_filter_status_all, value: "all" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <ListFilter className="size-4" />
          <span className="hidden sm:inline">
            {statusOptions.find((o) => o.value === status)?.label()}
          </span>
          <span className="sm:hidden">{m.common_actions_filter()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>
          {m.subscription_filter_status_label()}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {statusOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onStatusChange(option.value)}
              className="cursor-pointer"
            >
              <Check
                className={cn(
                  "mr-2 size-4",
                  status === option.value ? "opacity-100" : "opacity-0",
                )}
              />
              {option.label()}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
