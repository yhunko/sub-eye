import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { FC, useCallback, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import * as m from "@/i18n/messages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { buildHistoryInsights } from "../model/history-insights";
import { useDateFnsLocale } from "@/shared/lib/date-fns-context";
import { useSubscriptionHistory } from "@/entities/subscription/api/use-subscription-history";
import { SubscriptionHistoryTimelineBody } from "./components/subscription-history-timeline-body";

type SubscriptionHistoryPanelProps = {
  subscriptionId: string;
};

const SubscriptionHistoryPanelHeader: FC = () => (
  <DialogHeader className="border-b px-4 py-3 text-left md:px-6 md:py-4">
    <DialogTitle className="text-base md:text-lg">
      {m.subscription_history_panel_title()}
    </DialogTitle>
    <DialogDescription className="text-xs md:text-sm">
      {m.subscription_history_panel_description()}
    </DialogDescription>
  </DialogHeader>
);

const SubscriptionHistoryDrawerHeader: FC = () => (
  <DrawerHeader className="border-b px-4 py-2 text-left">
    <DrawerTitle className="text-base">
      {m.subscription_history_panel_title()}
    </DrawerTitle>
    <DrawerDescription className="line-clamp-2 text-xs">
      {m.subscription_history_panel_description()}
    </DrawerDescription>
  </DrawerHeader>
);

export const SubscriptionHistoryPanel =
  NiceModal.create<SubscriptionHistoryPanelProps>(({ subscriptionId }) => {
    const modal = useModal();
    const router = useRouter();
    const isDesktop = useBreakpoint("md");
    const { locale } = useDateFnsLocale();

    const { data, isPending, isError, isFetching, refetch } =
      useSubscriptionHistory({
        params: { id: subscriptionId },
        options: {
          enabled: modal.visible,
        },
      });

    const history = data?.history;
    const hasMore = data?.hasMore ?? false;
    const insights = useMemo(
      () => buildHistoryInsights(history ?? []),
      [history],
    );

    const closePanel = useCallback(async () => {
      await modal.hide();
      modal.remove();
    }, [modal]);

    const handleOpenChange = (open: boolean) => {
      if (!open) {
        void closePanel();
      }
    };

    const handleUpgrade = useCallback(() => {
      void closePanel();
      void router.navigate({ to: "/settings/billing" }).catch(() => {
        window.location.assign("/settings/billing");
      });
    }, [closePanel, router]);

    const timelineProps = {
      subscriptionId,
      insights,
      hasMore,
      isPending,
      isError,
      isFetching,
      onRetry: () => {
        void refetch();
      },
      onUpgrade: handleUpgrade,
      locale,
    };

    if (isDesktop) {
      return (
        <Dialog open={modal.visible} onOpenChange={handleOpenChange}>
          <DialogContent className="flex h-[85vh] max-h-[85vh] w-[min(920px,calc(100%-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
            <SubscriptionHistoryPanelHeader />
            <SubscriptionHistoryTimelineBody
              {...timelineProps}
              compact={false}
            />
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Drawer open={modal.visible} onOpenChange={handleOpenChange}>
        <DrawerContent className="h-[80vh]">
          <SubscriptionHistoryDrawerHeader />
          <SubscriptionHistoryTimelineBody {...timelineProps} compact />
        </DrawerContent>
      </Drawer>
    );
  });
