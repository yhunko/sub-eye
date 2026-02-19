import NiceModal from "@ebay/nice-modal-react";
import { useEffect } from "react";
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
import { startOfDay } from "date-fns";
import * as m from "@/i18n/messages";
import { useConfirmableSubscriptionDate } from "./lib/use-confirmable-subscription-date";
import { useSubscriptionUpdateDialog } from "./lib/use-subscription-update-dialog";
import { toast } from "sonner";

interface SubscriptionRenewDialogProps {
  subscriptionId: string;
  subscriptionName: string;
}

export const SubscriptionRenewDialog =
  NiceModal.create<SubscriptionRenewDialogProps>(
    ({ subscriptionId, subscriptionName }) => {
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
          setSelectedDate(startOfDay(new Date()));
          setValidationError(null);
        }
      }, [modal.visible, setSelectedDate, setValidationError]);

      const { handleConfirm } = useConfirmableSubscriptionDate({
        selectedDate,
        dateFnsFormat,
        locale,
        requiredMessage: m.validation_required(),
        setValidationError,
        onConfirm: (renewalDateIso) => {
          updateSubscription(
            {
              id: subscriptionId,
              payload: {
                paymentDate: renewalDateIso,
                willBeCancelledAt: null,
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
                  onChange={handleDateChange}
                />
                {validationError && (
                  <p className="text-destructive text-xs">{validationError}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  void closeModal();
                }}
              >
                {m.common_actions_cancel()}
              </Button>
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending && <Spinner />}
                {m.common_actions_confirm()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
  );
