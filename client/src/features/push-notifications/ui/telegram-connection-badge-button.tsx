import { Bot, Link2Off } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";

type TelegramConnectionBadgeButtonProps = {
  disabled?: boolean;
  isPending?: boolean;
  mode: "connected" | "disconnected";
  onClick: () => void;
};

export const TelegramConnectionBadgeButton = ({
  disabled = false,
  isPending = false,
  mode,
  onClick,
}: TelegramConnectionBadgeButtonProps) => {
  const isConnected = mode === "connected";
  const label = isConnected
    ? m.settings_notifications_telegram_disconnect()
    : m.settings_notifications_telegram_connect();
  const icon = isConnected ? (
    <Link2Off className="size-4" />
  ) : (
    <Bot className="size-4" />
  );

  if (isPending) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        className={cn(
          "rounded-full px-3 shadow-xs disabled:opacity-100",
          isConnected
            ? "border-destructive/30 bg-destructive/5 text-destructive"
            : "border-border bg-background text-foreground",
        )}
      >
        <Spinner className="size-3.5" />
        {label}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-full px-3 shadow-xs",
        isConnected
          ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 dark:bg-destructive/10"
          : "border-border bg-background text-foreground",
      )}
    >
      {icon}
      {label}
    </Button>
  );
};
