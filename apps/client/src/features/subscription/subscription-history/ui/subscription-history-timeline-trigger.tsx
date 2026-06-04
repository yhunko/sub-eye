import { HistoryIcon } from "lucide-react";
import type { FC } from "react";
import * as m from "@/i18n/messages";
import { Button } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { openSubscriptionHistoryPanel } from "../model/open-subscription-history-panel";

type SubscriptionHistoryTimelineTriggerProps = {
  subscriptionId: string;
  className?: string;
};

export const SubscriptionHistoryTimelineTrigger: FC<
  SubscriptionHistoryTimelineTriggerProps
> = ({ subscriptionId, className }) => {
  return (
    <Button
      size="lg"
      variant="outline"
      className={cn("h-11 w-full justify-start rounded-xl", className)}
      onClick={() => {
        void openSubscriptionHistoryPanel({ subscriptionId });
      }}
    >
      <HistoryIcon className="size-4" aria-hidden />
      {m.subscription_history_openTimeline()}
    </Button>
  );
};
