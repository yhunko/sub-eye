import { CheckCheck, FolderPen, Trash2, X } from "lucide-react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m as motion,
} from "motion/react";
import * as m from "@/i18n/messages";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

type SubscriptionBulkActionBarProps = {
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  onBulkAssignCategory: () => void;
};

export const SubscriptionBulkActionBar = ({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkAssignCategory,
}: SubscriptionBulkActionBarProps) => {
  const visible = selectedCount > 1;

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {visible ? (
          <motion.div
            key="bulk-action-bar"
            initial={{ y: 80, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 80, scale: 0.96 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              mass: 0.8,
            }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
            aria-live="polite"
          >
            <div className="bg-background/95 supports-backdrop-filter:bg-background/70 rounded-2xl border px-4 py-2.5 shadow-xl shadow-black/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="shrink-0 px-2.5 py-1 text-xs font-medium"
                >
                  {m.subscriptions_selection_count({ count: selectedCount })}
                </Badge>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 px-3 text-xs font-medium"
                    onClick={onDeselectAll}
                  >
                    <X className="size-3.5" />
                    {m.subscriptions_selection_clear()}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 px-3 text-xs font-medium"
                    onClick={onSelectAll}
                  >
                    <CheckCheck className="size-3.5" />
                    {m.subscriptions_selection_select_all()}
                  </Button>

                  <div className="bg-border mx-1 h-5 w-px" aria-hidden />

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 px-3 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={onBulkAssignCategory}
                  >
                    <FolderPen className="size-3.5" />
                    {m.subscriptions_action_assign_category()}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-8 gap-1.5 px-3 text-xs font-medium"
                    onClick={onBulkDelete}
                  >
                    <Trash2 className="size-3.5" />
                    {m.subscriptions_action_delete_selected()}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
};
