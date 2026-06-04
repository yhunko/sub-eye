import type { SubscriptionDto } from "@subeye/shared";
import { ChevronsUpDown } from "lucide-react";
import type { FC } from "react";
import * as m from "@/i18n/messages";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";

type SubscriptionOverviewStatusSelectorProps = {
  status: SubscriptionDto["status"];
  onMarkAsCanceled: () => void;
  onRenew: () => void;
};

type StatusSelectorValue = "active" | "cancelled";

function toNormalizedStatus(
  status: SubscriptionDto["status"],
): StatusSelectorValue {
  if (status === "active") {
    return "active";
  }

  return "cancelled";
}

function getStatusLabel(status: SubscriptionDto["status"]) {
  if (status === "active") {
    return m.subscription_filter_status_active();
  }

  if (status === "cancelledButActive") {
    return m.subscription_status_cancelledButActive();
  }

  return m.subscription_status_cancelled();
}

function getStatusTone(status: SubscriptionDto["status"]) {
  if (status === "cancelled") {
    return {
      triggerClassName:
        "border-red-400/60 bg-red-500/10 text-red-700 hover:bg-red-500/15 focus-visible:ring-red-500/30 dark:text-red-300",
      dotClassName: "bg-red-500",
    };
  }

  if (status === "cancelledButActive") {
    return {
      triggerClassName:
        "border-amber-400/60 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 focus-visible:ring-amber-500/30 dark:text-amber-300",
      dotClassName: "bg-amber-500",
    };
  }

  return {
    triggerClassName:
      "border-emerald-400/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 focus-visible:ring-emerald-500/30 dark:text-emerald-300",
    dotClassName: "bg-emerald-500",
  };
}

export const SubscriptionOverviewStatusSelector: FC<
  SubscriptionOverviewStatusSelectorProps
> = ({ status, onMarkAsCanceled, onRenew }) => {
  const normalizedStatus = toNormalizedStatus(status);
  const tone = getStatusTone(status);
  const statusLabel = getStatusLabel(status);

  const handleStatusSelect = (nextStatus: StatusSelectorValue) => {
    if (nextStatus === normalizedStatus) {
      return;
    }

    if (nextStatus === "cancelled") {
      onMarkAsCanceled();
      return;
    }

    onRenew();
  };

  const handleValueChange = (value: string) => {
    if (value === "active" || value === "cancelled") {
      handleStatusSelect(value);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 rounded-full px-3 text-sm font-medium shadow-none",
            tone.triggerClassName,
          )}
          aria-label={statusLabel}
        >
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              tone.dotClassName,
            )}
            aria-hidden
          />
          <span>{statusLabel}</span>
          <ChevronsUpDown className="size-3.5 opacity-80" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-44 rounded-xl p-1">
        <DropdownMenuRadioGroup
          value={normalizedStatus}
          onValueChange={handleValueChange}
        >
          <DropdownMenuRadioItem value="active" className="rounded-lg">
            {m.subscription_filter_status_active()}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="cancelled" className="rounded-lg">
            {m.subscription_status_cancelled()}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
