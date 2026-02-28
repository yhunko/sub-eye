import { FC } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, PencilIcon } from "lucide-react";
import { Button } from "@/shared/components";
import * as m from "@/i18n/messages";

type SubscriptionOverviewHeaderActionsProps = {
  subscriptionId: string;
  subscriptionName: string;
  onBack: () => Promise<void> | void;
};

export const SubscriptionOverviewHeaderActions: FC<
  SubscriptionOverviewHeaderActionsProps
> = ({ subscriptionId, subscriptionName, onBack }) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="outline"
        className="h-11 rounded-full px-4"
        onClick={() => {
          void onBack();
        }}
        aria-label={m.subscription_overview_back()}
      >
        <ChevronLeft className="size-4" aria-hidden />
        {m.subscription_overview_back()}
      </Button>

      <Button
        variant="outline"
        asChild
        className="h-11 rounded-full px-4"
        aria-label={m.subscription_overview_edit({
          name: subscriptionName,
        })}
      >
        <Link to="/subscriptions/$id/edit" params={{ id: subscriptionId }}>
          <PencilIcon className="size-4" aria-hidden />
          {m.common_actions_edit()}
        </Link>
      </Button>
    </div>
  );
};
