"use client";

import * as React from "react";
import { FC, useState, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  Button,
  PopoverTrigger,
  Spinner,
} from "@/shared/components";
import { PopoverConfirmationContent } from "@/shared/components/ui/popover-confirmation-content";
import { Trash2 } from "lucide-react";
import { useDeleteSubscription } from "@/entities/subscription";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type SubscriptionDeleteButtonProps = {
  subscriptionId: string;
  fullWidth?: boolean;
  buttonClassName?: string;
  onSuccess?: () => void;
};

export const SubscriptionDeleteButton: FC<SubscriptionDeleteButtonProps> = ({
  subscriptionId,
  buttonClassName,
  fullWidth = false,
  onSuccess,
}) => {
  const [open, setOpen] = useState(false);
  const t = useTranslations("subscription");
  const tCommon = useTranslations("common.actions");

  const { mutate: deleteSubscription, isPending } = useDeleteSubscription();

  const handleDelete = useCallback(() => {
    deleteSubscription(subscriptionId, {
      async onSuccess() {
        onSuccess?.();
        setOpen(false);
        toast.success(t("messages.deleted"));
      },
    });
  }, [deleteSubscription, onSuccess, subscriptionId, t]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="destructive"
          size={fullWidth ? "lg" : "icon-sm"}
          className={buttonClassName}
        >
          <Trash2 className="size-4 transition-all" />
          {fullWidth && !isPending && <span>{t("delete.button")}</span>}
          {fullWidth && isPending && <span>{tCommon("deleting")}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top">
        <PopoverConfirmationContent
          description={t("delete.confirm")}
          CancelButton={
            <Button size="sm" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
          }
          ConfirmButton={
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && <Spinner />}
              {tCommon("yes")}
            </Button>
          }
        />
      </PopoverContent>
    </Popover>
  );
};
