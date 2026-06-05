import { RefreshCw, TriangleAlert } from "lucide-react";
import * as m from "@/i18n/messages";
import { Button } from "@/shared/components/ui/button";
import { Item } from "@/shared/components/ui/item";
import { TelegramNotificationsCardShell } from "./telegram-notifications-card-shell";

type TelegramErrorCardProps = {
  onRetry: () => void;
};

export const TelegramErrorCard = ({ onRetry }: TelegramErrorCardProps) => {
  return (
    <TelegramNotificationsCardShell>
      <Item
        variant="outline"
        className="border-destructive/35 bg-destructive/5 items-center justify-between gap-3"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="border-destructive/20 bg-background/90 text-destructive flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-xs">
            <TriangleAlert className="size-4" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium">{m.messages_error()}</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {m.settings_notifications_telegram_description()}
            </p>
          </div>
        </div>

        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="size-4" />
          {m.settings_notifications_telegram_connect_retry()}
        </Button>
      </Item>
    </TelegramNotificationsCardShell>
  );
};
