import { WandSparkles } from "lucide-react";
import type { TelegramNotificationStatus } from "shared";
import * as m from "@/i18n/messages";
import { Badge } from "@/shared/components/ui/badge";
import { Item } from "@/shared/components/ui/item";
import { Switch } from "@/shared/components/ui/switch";
import { TelegramConnectionBadgeButton } from "./telegram-connection-badge-button";
import { TelegramNotificationsCardShell } from "./telegram-notifications-card-shell";
import { TelegramTemplateBuilderModal } from "./telegram-template-builder-modal";

type TelegramConnectedCardProps = {
  isDisconnecting: boolean;
  isUpdatingPreferences: boolean;
  onDisconnect: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  status: TelegramNotificationStatus;
};

export const TelegramConnectedCard = ({
  isDisconnecting,
  isUpdatingPreferences,
  onDisconnect,
  onToggleEnabled,
  status,
}: TelegramConnectedCardProps) => {
  const accountLabel =
    status.accountLabel ?? m.settings_notifications_telegram_status_connected();
  const isBusy = isDisconnecting || isUpdatingPreferences;

  return (
    <TelegramNotificationsCardShell
      headerAction={
        <TelegramConnectionBadgeButton
          disabled={isBusy}
          isPending={isDisconnecting}
          mode="connected"
          onClick={onDisconnect}
        />
      }
      footerAction={
        <TelegramTemplateBuilderModal
          status={status}
          triggerVariant="default"
          triggerIcon={<WandSparkles className="size-4" />}
          triggerClassName="w-full justify-center shadow-xs"
        />
      }
    >
      <Item variant="outline" className="items-center gap-3">
        <div className="min-w-0 flex-1">
          <Badge
            variant="outline"
            className="max-w-full rounded-full px-3 py-1"
          >
            <span className="truncate">{accountLabel}</span>
          </Badge>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-xs">
            <span className="text-xs font-medium whitespace-nowrap">
              {status.enabled
                ? m.settings_notifications_telegram_status_enabled()
                : m.settings_notifications_telegram_status_disabled()}
            </span>
            <Switch
              id="telegram-notification-toggle"
              checked={status.enabled}
              onCheckedChange={onToggleEnabled}
              disabled={isBusy}
              aria-label={m.settings_notifications_telegram_toggleAria()}
            />
          </div>
        </div>
      </Item>
    </TelegramNotificationsCardShell>
  );
};
