import { FC, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Spinner,
} from "@/shared/components";
import { SubscriptionDatePicker } from "./add-subscription/ui/subscription-date-picker/subscription-date-picker";
import { cn } from "@/shared/lib/classes-utils";
import { startOfDay } from "date-fns";
import { useDateFnsLocale } from "../../shared/lib/date-fns-context";
import { useDateFormat } from "../../shared/hooks/use-date-format";
import * as m from "@/i18n/messages";
import { useConfirmableSubscriptionDate } from "./lib/use-confirmable-subscription-date";

interface SubscriptionRenewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (renewalDateIso: string) => void;
  subscriptionName: string;
  pending?: boolean;
}

export const SubscriptionRenewDialog: FC<SubscriptionRenewDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  subscriptionName,
  pending = false,
}) => {
  const { dateFnsFormat } = useDateFormat();
  const { locale } = useDateFnsLocale();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedDate(startOfDay(new Date()));
      setValidationError(null);
    }
  }, [open]);

  const { formattedDate, handleConfirm } = useConfirmableSubscriptionDate({
    selectedDate,
    dateFnsFormat,
    locale,
    requiredMessage: m.validation_required(),
    setValidationError,
    onConfirm,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {m.subscription_renew_title({ name: subscriptionName })}
          </DialogTitle>
          <DialogDescription>
            {m.subscription_renew_description()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {m.form_billingInfo_renewalDate_label()}
            </Label>
            <SubscriptionDatePicker
              value={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                if (validationError) {
                  setValidationError(null);
                }
              }}
            />
            {validationError && (
              <p className="text-destructive text-xs">{validationError}</p>
            )}
          </div>

          <div
            className={cn(
              "rounded-lg border p-3",
              selectedDate ? "bg-muted/50" : "bg-background",
            )}
          >
            <p className="text-foreground text-sm font-medium">
              {m.subscription_renew_activeFrom({ date: formattedDate })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              {m.common_actions_cancel()}
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={pending}>
            {pending && <Spinner />}
            {m.common_actions_confirm()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
