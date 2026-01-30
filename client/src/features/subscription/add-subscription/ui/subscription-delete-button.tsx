import { Button } from "@/shared/components";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useDeleteSubscription } from "@/entities/subscription";
import * as m from "@/i18n/messages";

type SubscriptionDeleteButtonProps = {
  subscriptionId: string;
  subscriptionName?: string;
};

export const SubscriptionDeleteButton = ({
  subscriptionId,
  subscriptionName,
}: SubscriptionDeleteButtonProps) => {
  const { mutate: deleteSubscription } = useDeleteSubscription();

  const handleDelete = async () => {
    const confirmed = window.confirm(
      m.messages_confirmDelete({ name: subscriptionName ?? "" }),
    );

    if (!confirmed) return;

    deleteSubscription(
      { id: subscriptionId },
      {
        onSuccess() {
          toast.success(m.messages_deleted());
        },
        onError() {
          toast.error(m.messages_error());
        },
      },
    );
  };

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleDelete}
      size="icon"
    >
      <Trash2 />
      <span className="sr-only">{m.form_buttons_delete()}</span>
    </Button>
  );
};
