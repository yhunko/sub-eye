import { Button } from "@/shared/components/ui/button";
import { Trash2 } from "lucide-react";
import * as m from "@/i18n/messages";
import { openSubscriptionDeleteDialog } from "../model/open-subscription-delete-dialog";

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
  return (
    <Button
      type="button"
      variant="destructive"
      size={fullWidth ? "lg" : "icon"}
      className={className}
      aria-label={m.form_buttons_delete()}
      data-slot="button"
      onClick={() => {
        void openSubscriptionDeleteDialog({
          subscriptionId,
          subscriptionName,
          onSuccess,
        });
      }}
    >
      <Trash2 className="size-4" aria-hidden />
      {fullWidth && m.form_buttons_delete()}
    </Button>
  );
};
