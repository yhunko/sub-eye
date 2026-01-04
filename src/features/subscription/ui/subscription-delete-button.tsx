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

  const { mutate: deleteSubscription, isPending } = useDeleteSubscription();

  const handleDelete = useCallback(() => {
    deleteSubscription(subscriptionId, {
      async onSuccess() {
        onSuccess?.();
        setOpen(false);
        toast.success("Subscription deleted successfully!");
      },
    });
  }, [deleteSubscription, onSuccess, subscriptionId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="destructive"
          size={fullWidth ? "lg" : "icon-sm"}
          className={buttonClassName}
        >
          <Trash2 className="size-4 transition-all" />
          {fullWidth && !isPending && <span>Delete subscription</span>}
          {fullWidth && isPending && <span>Deleting...</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top">
        <PopoverConfirmationContent
          description="Are you sure?"
          CancelButton={
            <Button size="sm" onClick={() => setOpen(false)}>
              Cancel
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
              Yes
            </Button>
          }
        />
      </PopoverContent>
    </Popover>
  );
};
