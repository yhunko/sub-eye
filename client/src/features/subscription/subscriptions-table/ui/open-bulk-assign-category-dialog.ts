import NiceModal from "@ebay/nice-modal-react";

type OpenBulkAssignCategoryDialogParams = {
  subscriptionIds: string[];
  onSuccess?: () => void;
  onClearSelection?: () => void;
};

export const openBulkAssignCategoryDialog = async ({
  subscriptionIds,
  onSuccess,
  onClearSelection,
}: OpenBulkAssignCategoryDialogParams) => {
  const { BulkAssignCategoryDialog } =
    await import("./bulk-assign-category-dialog");

  await NiceModal.show(BulkAssignCategoryDialog, {
    subscriptionIds,
    onSuccess,
    onClearSelection,
  });
};
