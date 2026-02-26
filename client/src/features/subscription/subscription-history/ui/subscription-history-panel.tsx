import { FC } from "react";
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
import { type Locale } from "date-fns";
import { HistoryInsights } from "../model/history-insights";
import { SubscriptionHistoryTimelineBody } from "./components/subscription-history-timeline-body";

type SubscriptionHistoryPanelProps = {
  subscriptionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insights: HistoryInsights;
  hasMore: boolean;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
  locale: Locale;
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

const SubscriptionHistoryPanel: FC<SubscriptionHistoryPanelProps> = ({
  open,
  onOpenChange,
  ...props
}) => {
  const isDesktop = useBreakpoint("md");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[85vh] max-h-[85vh] w-[min(920px,calc(100%-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <SubscriptionHistoryPanelHeader />
          <SubscriptionHistoryTimelineBody {...props} compact={false} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh]">
        <SubscriptionHistoryDrawerHeader />
        <SubscriptionHistoryTimelineBody {...props} compact />
      </DrawerContent>
    </Drawer>
  );
};

export default SubscriptionHistoryPanel;
