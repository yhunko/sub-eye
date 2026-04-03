import NiceModal from "@ebay/nice-modal-react";
import type { CategoryDto } from "shared";
import type { BulkDeleteSubscriptionItem } from "./bulk-delete-subscriptions-dialog";

type OpenBulkDeleteSubscriptionsDialogParams = {
  subscriptions: BulkDeleteSubscriptionItem[];
  categories: CategoryDto[];
  onSuccess?: () => void;
  onClearSelection?: () => void;
};

export const openBulkDeleteSubscriptionsDialog = async ({
  subscriptions,
  categories,
  onSuccess,
  onClearSelection,
}: OpenBulkDeleteSubscriptionsDialogParams) => {
  const { BulkDeleteSubscriptionsDialog } = await import(
    "./bulk-delete-subscriptions-dialog"
  );

  await NiceModal.show(BulkDeleteSubscriptionsDialog, {
    subscriptions,
    categories,
    onSuccess,
    onClearSelection,
  });
};
