import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { useCallback, useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Button,
  Separator,
} from "@/shared/components";
import * as m from "@/i18n/messages";
import {
  SubscriptionSortField,
  SortDirection,
  StatusFilter,
} from "@shared/domains/subscription";
import { cn } from "@/shared/lib/classes-utils";

interface SubscriptionsFilterDialogProps {
  sortBy: SubscriptionSortField;
  direction: SortDirection;
  status: StatusFilter;
  onSortChange: (
    sortBy: SubscriptionSortField,
    direction: SortDirection,
  ) => void;
  onStatusChange: (status: StatusFilter) => void;
}

const sortOptions: { label: () => string; value: SubscriptionSortField }[] = [
  { label: m.subscription_filter_sort_renewal, value: "nextPaymentDate" },
  { label: m.subscription_filter_sort_name, value: "name" },
  { label: m.subscription_filter_sort_cost, value: "cost" },
];

const statusOptions: { label: () => string; value: StatusFilter }[] = [
  { label: m.subscription_filter_status_active, value: "active" },
  {
    label: m.subscription_status_cancelledButActive,
    value: "cancelledButActive",
  },
  { label: m.subscription_status_cancelled, value: "cancelled" },
  { label: m.subscription_filter_status_all, value: "all" },
];

export const SubscriptionsFilterDialog =
  NiceModal.create<SubscriptionsFilterDialogProps>(
    ({ sortBy, direction, status, onSortChange, onStatusChange }) => {
      const modal = useModal();
      const [localStatus, setLocalStatus] = useState<StatusFilter>(status);
      const [localSortBy, setLocalSortBy] =
        useState<SubscriptionSortField>(sortBy);
      const [localDirection, setLocalDirection] =
        useState<SortDirection>(direction);

      const closeModal = useCallback(async () => {
        await modal.hide();
        modal.remove();
      }, [modal]);

      useEffect(() => {
        if (modal.visible) {
          setLocalStatus(status);
          setLocalSortBy(sortBy);
          setLocalDirection(direction);
        }
      }, [direction, modal.visible, sortBy, status]);

      const handleApply = async () => {
        onStatusChange(localStatus);
        onSortChange(localSortBy, localDirection);
        await closeModal();
      };

      const handleSortSelect = (field: SubscriptionSortField) => {
        if (localSortBy === field) {
          setLocalDirection(localDirection === "asc" ? "desc" : "asc");
          return;
        }

        setLocalSortBy(field);
        setLocalDirection("desc");
      };

      return (
        <Drawer
          open={modal.visible}
          onOpenChange={(open) => {
            if (!open) {
              void closeModal();
            }
          }}
        >
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
                      variant={
                        localStatus === option.value ? "default" : "outline"
                      }
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
              <Button variant="outline" onClick={closeModal} className="flex-1">
                {m.common_actions_cancel()}
              </Button>
              <Button onClick={() => void handleApply()} className="flex-1">
                {m.common_actions_apply()}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      );
    },
  );
