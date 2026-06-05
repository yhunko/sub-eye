import NiceModal from "@ebay/nice-modal-react";
import { useEffect } from "react";
import { toast } from "sonner";
import * as m from "@/i18n/messages";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Spinner,
} from "@/shared/components";
import { SubscriptionDatePicker } from "./add-subscription/ui/subscription-date-picker/subscription-date-picker";
import { useConfirmableSubscriptionDate } from "./lib/use-confirmable-subscription-date";
import { useSubscriptionUpdateDialog } from "./lib/use-subscription-update-dialog";

interface SubscriptionCancelDialogProps {
  subscriptionId: string;
  subscriptionName: string;
  defaultCancelledAt: string;
}

const toValidDate = (value: string): Date | undefined => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const SubscriptionCancelDialog =
  NiceModal.create<SubscriptionCancelDialogProps>(
    ({ subscriptionId, subscriptionName, defaultCancelledAt }) => {
      const {
        modal,
        dateFnsFormat,
        locale,
        selectedDate,
        setSelectedDate,
        validationError,
        setValidationError,
        updateSubscription,
        isPending,
        closeModal,
        handleDateChange,
      } = useSubscriptionUpdateDialog();

      useEffect(() => {
        if (modal.visible) {
          setSelectedDate(toValidDate(defaultCancelledAt) ?? new Date());
          setValidationError(null);
        }
      }, [
        defaultCancelledAt,
        modal.visible,
        setSelectedDate,
        setValidationError,
      ]);

      const { handleConfirm } = useConfirmableSubscriptionDate({
        selectedDate,
        dateFnsFormat,
        locale,
        requiredMessage: m.validation_required(),
        setValidationError,
        onConfirm: (cancelledAtIso) => {
          updateSubscription(
            {
              id: subscriptionId,
              payload: {
                paymentDate: cancelledAtIso,
                willBeCancelledAt: cancelledAtIso,
              },
            },
            {
              onSuccess: async () => {
                toast.success(m.messages_updated());
                await closeModal();
              },
              onError: () => {
                toast.error(m.messages_error());
              },
            },
          );
        },
      });

      return (
        <Dialog
          open={modal.visible}
          onOpenChange={(open) => {
            if (!open) {
              void closeModal();
            }
          }}
        >
          <DialogContent className="sm:max-w-130">
            <DialogHeader>
              <DialogTitle>
                {m.subscription_cancel_title({ name: subscriptionName })}
              </DialogTitle>
              <DialogDescription>
                {m.subscription_cancel_description()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {m.form_billingInfo_willBeCancelledAt_label()}
                </Label>
                <SubscriptionDatePicker
                  value={selectedDate}
                  onChange={handleDateChange}
                />
                <p className="text-muted-foreground text-xs">
                  {m.subscription_cancel_paymentDateReset()}
                </p>
                {validationError && (
                  <p className="text-destructive text-xs">{validationError}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={closeModal}
              >
                {m.common_actions_cancel()}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isPending}
              >
                {isPending && <Spinner />}
                {m.common_actions_confirm()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
  );
