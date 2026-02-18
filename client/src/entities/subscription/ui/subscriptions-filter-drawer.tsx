import { FC, useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  Button,
  Separator,
} from "@/shared/components";
import { ListFilter } from "lucide-react";
import {
  SubscriptionSortField,
  SortDirection,
  StatusFilter,
} from "@shared/domains/subscription";
import * as m from "@/i18n/messages";
import { cn } from "@/shared/lib/classes-utils";

const sortOptions: { label: () => string; value: SubscriptionSortField }[] = [
  { label: m.subscription_filter_sort_renewal, value: "nextPaymentDate" },
  { label: m.subscription_filter_sort_name, value: "name" },
  { label: m.subscription_filter_sort_cost, value: "cost" },
];

interface SubscriptionsFilterDrawerProps {
  sortBy: SubscriptionSortField;
  direction: SortDirection;
  status: StatusFilter;
  onSortChange: (
    sortBy: SubscriptionSortField,
    direction: SortDirection,
  ) => void;
  onStatusChange: (status: StatusFilter) => void;
}

export const SubscriptionsFilterDrawer: FC<SubscriptionsFilterDrawerProps> = ({
  sortBy,
  direction,
  status,
  onSortChange,
  onStatusChange,
}) => {
  const [localStatus, setLocalStatus] = useState<StatusFilter>(status);
  const [localSortBy, setLocalSortBy] = useState<SubscriptionSortField>(sortBy);
  const [localDirection, setLocalDirection] =
    useState<SortDirection>(direction);
  const [isOpen, setIsOpen] = useState(false);

  // Reset local state when drawer opens to match current props
  useEffect(() => {
    if (isOpen) {
      setLocalStatus(status);
      setLocalSortBy(sortBy);
      setLocalDirection(direction);
    }
  }, [isOpen, status, sortBy, direction]);

  const handleApply = () => {
    onStatusChange(localStatus);
    onSortChange(localSortBy, localDirection);
    setIsOpen(false);
  };

  const handleSortSelect = (field: SubscriptionSortField) => {
    if (localSortBy === field) {
      setLocalDirection(localDirection === "asc" ? "desc" : "asc");
    } else {
      setLocalSortBy(field);
      setLocalDirection("desc"); // Default to desc for new field
    }
  };

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
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-xl"
        >
          <ListFilter className="size-5" />
          <span className="sr-only">{m.common_actions_filter()}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{m.common_actions_filter()}</DrawerTitle>
          <DrawerDescription>
            {m.subscription_filter_description()}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-6 p-4">
          <div className="space-y-3">
            <h4 className="text-muted-foreground text-sm font-medium">
              {m.subscription_filter_status_label()}
            </h4>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={localStatus === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLocalStatus(option.value)}
                  className="h-8 rounded-full px-3 text-xs"
                >
                  {localStatus === option.value && (
                    <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current" />
                  )}
                  {option.label()}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-muted-foreground text-sm font-medium">
              {m.subscription_filter_sortBy()}
            </h4>
            <div className="grid gap-2">
              {sortOptions.map((option) => {
                const isSelected = localSortBy === option.value;
                return (
                  <Button
                    key={option.value}
                    variant="ghost"
                    className={cn(
                      "hover:bg-muted/50 h-12 justify-between px-3 font-normal",
                      isSelected && "bg-muted font-medium",
                    )}
                    onClick={() => handleSortSelect(option.value)}
                  >
                    <span className="flex items-center gap-2">
                      {option.label()}
                    </span>
                    {isSelected && (
                      <span className="text-muted-foreground bg-background/50 flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs">
                        {localDirection === "asc"
                          ? m.subscription_filter_sort_asc()
                          : m.subscription_filter_sort_desc()}
                        {localDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <DrawerFooter className="flex-row gap-3 pt-2">
          <Button onClick={handleApply} className="flex-1">
            {m.common_actions_apply()}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
