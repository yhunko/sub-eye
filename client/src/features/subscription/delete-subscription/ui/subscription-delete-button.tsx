import { Button } from "@/shared/components/ui/button";
import { Trash2 } from "lucide-react";
import * as m from "@/i18n/messages";
import NiceModal from "@ebay/nice-modal-react";

type SubscriptionDeleteButtonProps = {
  subscriptionId: string;
  subscriptionName?: string;
  className?: string;
  fullWidth?: boolean;
  onSuccess?: () => Promise<void> | void;
};

export const SubscriptionDeleteButton = ({
  subscriptionId,
  subscriptionName,
  className,
  fullWidth,
  onSuccess,
}: SubscriptionDeleteButtonProps) => {
  const openDeleteDialog = async () => {
    const { SubscriptionDeleteDialog } =
      await import("./subscription-delete-dialog");

    await NiceModal.show(SubscriptionDeleteDialog, {
      subscriptionId,
      subscriptionName,
      onSuccess,
    });
  };

  return (
    <Button
      variant="destructive"
      size={fullWidth ? "lg" : "icon"}
      className={className}
      aria-label={m.form_buttons_delete()}
      data-slot="button"
      onClick={() => {
        void openDeleteDialog();
      }}
    >
      <Trash2 className="size-4" />
      {fullWidth && m.form_buttons_delete()}
    </Button>
  );
};
