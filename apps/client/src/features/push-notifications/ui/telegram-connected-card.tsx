import type { TelegramNotificationStatus } from "@subeye/shared";
import { WandSparkles } from "lucide-react";
import * as m from "@/i18n/messages";
import { Item, ItemActions, ItemContent, ItemTitle } from "@/shared/components";
import { Badge } from "@/shared/components/ui/badge";
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
      <Item className="items-center gap-3 p-0">
        <ItemContent className="min-w-0">
          <Badge
            variant="outline"
            className="max-w-full rounded-full px-3 py-1"
          >
            <span className="truncate">{accountLabel}</span>
          </Badge>
        </ItemContent>

        <ItemActions className="ml-auto">
          <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-xs">
            <ItemTitle className="text-xs whitespace-nowrap">
              {status.enabled
                ? m.settings_notifications_telegram_status_enabled()
                : m.settings_notifications_telegram_status_disabled()}
            </ItemTitle>
            <Switch
              id="telegram-notification-toggle"
              checked={status.enabled}
              onCheckedChange={onToggleEnabled}
              disabled={isBusy}
              aria-label={m.settings_notifications_telegram_toggleAria()}
            />
          </div>
        </ItemActions>
      </Item>
    </TelegramNotificationsCardShell>
  );
};
