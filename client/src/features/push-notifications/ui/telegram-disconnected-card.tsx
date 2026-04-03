import { Bot, WandSparkles } from "lucide-react";
import type { TelegramNotificationStatus } from "shared";
import * as m from "@/i18n/messages";
import { Item } from "@/shared/components/ui/item";
import { TelegramConnectionBadgeButton } from "./telegram-connection-badge-button";
import { TelegramNotificationsCardShell } from "./telegram-notifications-card-shell";
import { TelegramTemplateBuilderModal } from "./telegram-template-builder-modal";

type TelegramDisconnectedCardProps = {
  isBusy: boolean;
  onConnect: () => void;
  status: TelegramNotificationStatus;
};

export const TelegramDisconnectedCard = ({
  isBusy,
  onConnect,
  status,
}: TelegramDisconnectedCardProps) => {
  return (
    <TelegramNotificationsCardShell
      headerAction={
        <TelegramConnectionBadgeButton
          onClick={onConnect}
          disabled={isBusy}
          mode="disconnected"
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
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="text-muted-foreground bg-muted flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-xs">
            <Bot className="size-4" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium">
              {m.settings_notifications_telegram_status_notConnected()}
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {m.settings_notifications_telegram_description()}
            </p>
          </div>
        </div>
      </Item>
    </TelegramNotificationsCardShell>
  );
};
