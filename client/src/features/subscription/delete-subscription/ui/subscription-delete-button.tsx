import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Trash2 } from "lucide-react";
import { useDeleteSubscription } from "@/entities/subscription/api/use-delete-subscription";
import { useState } from "react";
import * as m from "@/i18n/messages";
import { cn } from "@/shared/lib/classes-utils";
import { toast } from "sonner";

type SubscriptionDeleteButtonProps = {
  subscriptionId: string;
  subscriptionName?: string;
  className?: string; // Wrapper class
  buttonClassName?: string;
  fullWidth?: boolean;
  onSuccess?: () => Promise<void> | void;
};

export const SubscriptionDeleteButton = ({
  subscriptionId,
  subscriptionName,
  className,
  buttonClassName,
  fullWidth,
  onSuccess,
}: SubscriptionDeleteButtonProps) => {
  const [open, setOpen] = useState(false);
  const { mutate: deleteSubscription, isPending } = useDeleteSubscription();

  const handleDelete = () => {
    deleteSubscription(
      { id: subscriptionId },
      {
        onSuccess: async () => {
          await onSuccess?.();
          setOpen(false);
          toast.success(m.messages_deleted());
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size={fullWidth ? "lg" : "icon"}
          className={cn(className, buttonClassName, fullWidth && "w-full")}
          aria-label={m.form_buttons_delete()}
          data-slot="button"
        >
          <Trash2 className={cn("size-4", fullWidth && "mr-2")} />
          {fullWidth && m.form_buttons_delete()}
        </Button>
      </DialogTrigger>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{m.form_buttons_delete()}</DialogTitle>
          <DialogDescription>
            {m.messages_confirmDelete({
              name: subscriptionName ?? "this subscription",
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              {m.subscription_overview_back()}
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {m.form_buttons_delete()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
