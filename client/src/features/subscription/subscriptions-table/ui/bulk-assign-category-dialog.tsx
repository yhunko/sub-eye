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
import { useBulkUpdateCategory } from "@/entities/subscription";
import * as m from "@/i18n/messages";
import { toast } from "sonner";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { categoriesQuery } from "@/entities/category";
import { Loader2 } from "lucide-react";

interface BulkAssignCategoryDialogProps {
  subscriptionIds: string[];
  onSuccess?: () => void;
  onClearSelection?: () => void;
}

export const BulkAssignCategoryDialog =
  NiceModal.create<BulkAssignCategoryDialogProps>(
    ({ subscriptionIds, onSuccess, onClearSelection }) => {
      const modal = useModal();
      const { userId } = useAuth();
      const { data: categories = [] } = useQuery(
        categoriesQuery({ params: { userId: userId ?? "" } }),
      );
      const { mutate: bulkUpdateCategory, isPending } = useBulkUpdateCategory();
      const selectedCount = subscriptionIds.length;

      const closeModal = useCallback(async () => {
        await modal.hide();
        modal.remove();
      }, [modal]);

      const handleAssign = (categoryId: string | null) => {
        bulkUpdateCategory(
          { ids: subscriptionIds, categoryId },
          {
            onSuccess: () => {
              toast.success(
                m.subscriptions_bulk_assign_success({
                  count: selectedCount,
                }),
              );
              onClearSelection?.();
              onSuccess?.();
              void closeModal();
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
                  <Loader2 className="text-primary size-8 animate-spin" />
                  <p className="text-muted-foreground text-sm">
                    {m.subscriptions_bulk_assign_loading()}
                  </p>
                </div>
              </div>
            )}
            <DialogHeader>
              <DialogTitle>
                {m.subscriptions_bulk_assign_category_title({
                  count: selectedCount,
                })}
              </DialogTitle>
              <DialogDescription>
                {m.subscriptions_bulk_assign_category_description()}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleAssign(null)}
              >
                {m.categories_filter_all()}
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAssign(cat.id)}
                >
                  {cat.emoji} {cat.name}
                </Button>
              ))}
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    },
  );
