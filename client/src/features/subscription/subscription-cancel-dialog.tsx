import { FC } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from "@/shared/components";
import * as m from "@/i18n/messages";
import { useDateFnsLocale } from "../../shared/lib/date-fns-context";
import { useDateFormat } from "../../shared/hooks/use-date-format";
import { format } from "date-fns";

interface SubscriptionCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  subscriptionName: string;
  nextPaymentDate: string;
}

export const SubscriptionCancelDialog: FC<SubscriptionCancelDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  subscriptionName,
  nextPaymentDate,
}) => {
  const { dateFnsFormat } = useDateFormat();
  const { locale } = useDateFnsLocale();
  const formattedDate = format(new Date(nextPaymentDate), dateFnsFormat, {
    locale,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {m.subscription_cancel_title({ name: subscriptionName })}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>{m.subscription_cancel_description()}</p>
            <p className="text-foreground font-medium">
              {m.subscription_cancel_activeUntil({ date: formattedDate })}
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{m.common_actions_cancel()}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            {m.common_actions_confirm()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
