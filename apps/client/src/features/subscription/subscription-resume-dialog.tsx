import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useResumeSubscription } from "@/entities/subscription";
import * as m from "@/i18n/messages";
import {
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

interface SubscriptionResumeDialogProps {
  subscriptionId: string;
  subscriptionName: string;
  /** The next payment date, shown so the user knows billing keeps its schedule. */
  nextPaymentDate?: string | null;
}

export const SubscriptionResumeDialog =
  NiceModal.create<SubscriptionResumeDialogProps>(
    ({ subscriptionId, subscriptionName, nextPaymentDate }) => {
      const modal = useModal();
      const { dateFnsFormat } = useDateFormat();
      const { locale } = useDateFnsLocale();
      const { mutate: resumeSubscription, isPending } = useResumeSubscription();

      const closeModal = async () => {
        await modal.hide();
        modal.remove();
      };

      const dateLabel = (() => {
        if (!nextPaymentDate) return null;
        const parsed = new Date(nextPaymentDate);
        return Number.isNaN(parsed.getTime())
          ? null
          : format(parsed, dateFnsFormat, { locale });
      })();

      const handleConfirm = () => {
        resumeSubscription(
          { id: subscriptionId },
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
                {m.subscription_resume_title({ name: subscriptionName })}
              </DialogTitle>
              <DialogDescription>
                {dateLabel
                  ? m.subscription_resume_description({ date: dateLabel })
                  : m.subscription_resume_noDate_description()}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 [&>button]:w-full sm:[&>button]:w-auto">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={closeModal}
              >
                {m.common_actions_cancel()}
              </Button>
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending && <Spinner />}
                {m.subscription_resume_confirm()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
  );
