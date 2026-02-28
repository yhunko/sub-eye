import { FC } from "react";
import { Link } from "@tanstack/react-router";
import {
  Ellipsis,
  HistoryIcon,
  PencilIcon,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { SubscriptionDto } from "shared";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components";
import { openSubscriptionHistoryPanel } from "../../subscription-history";
import { openSubscriptionDeleteDialog } from "../../delete-subscription";
import * as m from "@/i18n/messages";

type SubscriptionOverviewActionsDropdownProps = {
  subscriptionId: string;
  subscriptionName: string;
  status: SubscriptionDto["status"];
  onMarkAsCanceled: () => void;
  onRenew: () => void;
  onDeleteSuccess: () => Promise<void> | void;
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

const LifecycleMenuItem: FC<
  MenuActionProps & {
    status: SubscriptionDto["status"];
  }
> = ({ onSelect, status }) => {
  if (status === "active") {
    return (
      <DropdownMenuItem className="cursor-pointer" onSelect={onSelect}>
        <XCircle className="size-4" aria-hidden />
        {m.subscription_overview_markAsCanceled()}
      </DropdownMenuItem>
    );
  }

  if (status === "cancelled") {
    return (
      <DropdownMenuItem className="cursor-pointer" onSelect={onSelect}>
        <RotateCcw className="size-4" aria-hidden />
        {m.subscription_overview_markAsRenewed()}
      </DropdownMenuItem>
    );
  }

  return null;
};

export const SubscriptionOverviewActionsDropdown: FC<
  SubscriptionOverviewActionsDropdownProps
> = ({
  subscriptionId,
  subscriptionName,
  status,
  onMarkAsCanceled,
  onRenew,
  onDeleteSuccess,
}) => {
  const showLifecycleAction = status === "active" || status === "cancelled";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
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

        <HistoryMenuItem
          onSelect={() => {
            void openSubscriptionHistoryPanel({ subscriptionId });
          }}
        />

        {showLifecycleAction && (
          <>
            <DropdownMenuSeparator />
            <LifecycleMenuItem
              status={status}
              onSelect={status === "active" ? onMarkAsCanceled : onRenew}
            />
          </>
        )}

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
