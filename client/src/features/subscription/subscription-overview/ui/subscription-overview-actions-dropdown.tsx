import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  CalendarArrowUp,
  Ellipsis,
  HistoryIcon,
  PencilIcon,
  Trash2,
} from "lucide-react";
import type { FC } from "react";
import * as m from "@/i18n/messages";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { openSubscriptionDeleteDialog } from "../../delete-subscription";
import { openSubscriptionHistoryPanel } from "../../subscription-history";

type SubscriptionOverviewActionsDropdownProps = {
  subscriptionId: string;
  subscriptionName: string;
  hasScheduledPriceChange: boolean;
  onSchedulePriceChange: () => void;
  onDeleteSuccess: () => Promise<void> | void;
  triggerClassName?: string;
};

type MenuActionProps = {
  onSelect: () => void;
};

const HistoryMenuItem: FC<MenuActionProps> = ({ onSelect }) => (
  <DropdownMenuItem className="cursor-pointer" onSelect={onSelect}>
    <HistoryIcon className="size-4" aria-hidden />
    {m.subscription_history_openTimeline()}
  </DropdownMenuItem>
);

export const SubscriptionOverviewActionsDropdown: FC<
  SubscriptionOverviewActionsDropdownProps
> = ({
  subscriptionId,
  subscriptionName,
  hasScheduledPriceChange,
  onSchedulePriceChange,
  onDeleteSuccess,
  triggerClassName,
}) => {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn("size-11 rounded-full", triggerClassName)}
          aria-label={m.subscription_overview_actionsTrigger({
            name: subscriptionName,
          })}
        >
          <Ellipsis className="size-4" aria-hidden />
          <span className="sr-only">
            {m.subscription_overview_openActions()}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link to="/subscriptions/$id/edit" params={{ id: subscriptionId }}>
            <PencilIcon className="size-4" aria-hidden />
            {m.common_actions_edit()}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={onSchedulePriceChange}
        >
          <CalendarArrowUp className="size-4" aria-hidden />
          {hasScheduledPriceChange
            ? m.subscription_priceChange_action_edit()
            : m.subscription_priceChange_action_schedule()}
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            void navigate({
              to: "/subscriptions/compare",
              search: { prefillId: subscriptionId },
            });
          }}
        >
          <ArrowRightLeft className="size-4" aria-hidden />
          {m.comparator_action_open()}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <HistoryMenuItem
          onSelect={() => {
            void openSubscriptionHistoryPanel({ subscriptionId });
          }}
        />

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onSelect={() => {
            void openSubscriptionDeleteDialog({
              subscriptionId,
              subscriptionName,
              onSuccess: onDeleteSuccess,
            });
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          {m.form_buttons_delete()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
