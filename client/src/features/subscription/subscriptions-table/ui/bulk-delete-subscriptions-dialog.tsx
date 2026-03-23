import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useBulkDeleteSubscriptions } from "@/entities/subscription";
import * as m from "@/i18n/messages";
import { toast } from "sonner";
import type { CategoryDto } from "shared";
import { BrandfetchImage } from "@/features/brandfetch";
import { CategoryBadge } from "@/entities/category";
import { Loader2 } from "lucide-react";

export type BulkDeleteSubscriptionItem = {
  id: string;
  name: string;
  brandDomain: string | null;
  categoryId: string | null;
};

interface BulkDeleteSubscriptionsDialogProps {
  subscriptions: BulkDeleteSubscriptionItem[];
  categories: CategoryDto[];
  onSuccess?: () => void;
  onClearSelection?: () => void;
}

export const BulkDeleteSubscriptionsDialog =
  NiceModal.create<BulkDeleteSubscriptionsDialogProps>(
    ({ subscriptions, categories, onSuccess, onClearSelection }) => {
      const modal = useModal();
      const { mutate: bulkDelete, isPending } = useBulkDeleteSubscriptions();
      const selectedCount = subscriptions.length;

      const closeModal = useCallback(async () => {
        await modal.hide();
        modal.remove();
      }, [modal]);

      const handleDelete = () => {
        bulkDelete(
          { ids: subscriptions.map((s) => s.id) },
          {
            onSuccess: () => {
              toast.success(
                m.subscriptions_bulk_delete_success({ count: selectedCount }),
              );
              onClearSelection?.();
              void closeModal();
              onSuccess?.();
            },
            onError: () => {
              toast.error(m.messages_error());
            },
          },
        );
      };

      return (
        <Dialog
          open={modal.visible}
          onOpenChange={(open) => {
            if (!open) {
              void closeModal();
            }
          }}
        >
          <DialogContent onInteractOutside={(e) => e.preventDefault()}>
            {isPending && (
              <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="text-destructive size-8 animate-spin" />
                  <p className="text-muted-foreground text-sm">
                    {m.subscriptions_bulk_delete_loading()}
                  </p>
                </div>
              </div>
            )}
            <DialogHeader>
              <DialogTitle>
                {m.subscriptions_bulk_delete_confirm_title({
                  count: selectedCount,
                })}
              </DialogTitle>
              <DialogDescription>
                {m.subscriptions_bulk_delete_confirm_description()}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-60 divide-y overflow-y-auto rounded-md border">
              {subscriptions.map((sub) => {
                const category = categories.find(
                  (c) => c.id === sub.categoryId,
                );
                return (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <BrandfetchImage
                      domain={sub.brandDomain}
                      className="size-7 shrink-0"
                      decorative
                    />
                    <span className="flex-1 truncate text-sm font-medium">
                      {sub.name}
                    </span>
                    {category && <CategoryBadge category={category} />}
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  void closeModal();
                }}
              >
                {m.subscription_overview_back()}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                {m.subscriptions_action_delete_selected()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
  );
