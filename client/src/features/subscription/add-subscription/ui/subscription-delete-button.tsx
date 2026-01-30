import { Button } from "@/shared/components";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { useDeleteSubscription } from "@/entities/subscription";

type SubscriptionDeleteButtonProps = {
  subscriptionId: string;
  subscriptionName?: string;
};

export const SubscriptionDeleteButton = ({
  subscriptionId,
  subscriptionName,
}: SubscriptionDeleteButtonProps) => {
  const { t } = useTranslation("subscription");
  const { mutate: deleteSubscription } = useDeleteSubscription();

  const handleDelete = async () => {
    const confirmed = window.confirm(
      t("messages.confirmDelete", { name: subscriptionName ?? "" }),
    );

    if (!confirmed) return;

    deleteSubscription(
      { id: subscriptionId },
      {
        onSuccess() {
          toast.success(t("messages.deleted"));
        },
        onError() {
          toast.error(t("messages.error"));
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
      <span className="sr-only">{t("form.buttons.delete")}</span>
    </Button>
  );
};
