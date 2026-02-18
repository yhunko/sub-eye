import { FC } from "react";
import { Button } from "@/shared/components";
import { ListFilter } from "lucide-react";
import NiceModal from "@ebay/nice-modal-react";
import { SubscriptionSortField, SortDirection, StatusFilter } from "shared";
import * as m from "@/i18n/messages";

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
  const openFilters = async () => {
    const { SubscriptionsFilterDialog } =
      await import("./subscriptions-filter-dialog");

    await NiceModal.show(SubscriptionsFilterDialog, {
      sortBy,
      direction,
      status,
      onSortChange,
      onStatusChange,
    });
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="size-10 shrink-0 rounded-xl"
      onClick={() => {
        void openFilters();
      }}
    >
      <ListFilter className="size-5" />
      <span className="sr-only">{m.common_actions_filter()}</span>
    </Button>
  );
};
