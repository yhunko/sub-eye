import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { useCancelSubscription } from "@/entities/subscription";
import * as m from "@/i18n/messages";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
} from "@/shared/components";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";

interface SubscriptionCancelDialogProps {
  subscriptionId: string;
  subscriptionName: string;
  /** The next billing date — access is kept until then for a period-end cancel. */
  nextBillingDate: string;
}

export const SubscriptionCancelDialog =
  NiceModal.create<SubscriptionCancelDialogProps>(
    ({ subscriptionId, subscriptionName, nextBillingDate }) => {
      const modal = useModal();
      const { dateFnsFormat } = useDateFormat();
      const { locale } = useDateFnsLocale();
      const [confirmingImmediate, setConfirmingImmediate] = useState(false);
      const { mutate: cancelSubscription, isPending } = useCancelSubscription();

      const closeModal = async () => {
        await modal.hide();
        modal.remove();
      };

      const dateLabel = (() => {
        const parsed = new Date(nextBillingDate);
        return Number.isNaN(parsed.getTime())
          ? null
          : format(parsed, dateFnsFormat, { locale });
      })();

      const runCancel = (mode: "periodEnd" | "immediate") => {
        cancelSubscription(
          { id: subscriptionId, mode },
          {
            onSuccess: async () => {
              toast.success(m.messages_updated());
              await closeModal();
            },
            onError: () => toast.error(m.messages_error()),
          },
        );
      };

      return (
        <Dialog
          open={modal.visible}
          onOpenChange={(open) => {
            if (!open) void closeModal();
          }}
        >
          <DialogContent className="sm:max-w-130">
            <DialogHeader>
              <DialogTitle>
                {m.subscription_cancel_title({ name: subscriptionName })}
              </DialogTitle>
              <DialogDescription>
                {dateLabel
                  ? m.subscription_cancel_periodEnd_description({
                      date: dateLabel,
                    })
                  : m.subscription_cancel_periodEnd_noDate()}
              </DialogDescription>
            </DialogHeader>

            {confirmingImmediate && (
              <Alert variant="destructive">
                <AlertDescription>
                  {m.subscription_cancel_immediate_confirm()}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2 [&>button]:w-full sm:[&>button]:w-auto">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={closeModal}
              >
                {m.common_actions_cancel()}
              </Button>
              {confirmingImmediate ? (
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => runCancel("immediate")}
                >
                  {isPending && <Spinner />}
                  {m.subscription_cancel_immediate()}
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => setConfirmingImmediate(true)}
                  >
                    {m.subscription_cancel_immediate()}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => runCancel("periodEnd")}
                  >
                    {isPending && <Spinner />}
                    {m.subscription_cancel_confirm()}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
  );
