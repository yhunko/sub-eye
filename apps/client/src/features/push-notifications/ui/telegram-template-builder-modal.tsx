import type { TelegramNotificationStatus } from "@subeye/shared";
import { FlaskConical } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { toast } from "sonner";
import * as m from "@/i18n/messages";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import { track } from "@/shared/lib/analytics";
import { useSendTelegramTestNotification } from "../api/hooks";
import { TelegramTemplateBuilderCard } from "./telegram-template-builder-card";

type TelegramTemplateBuilderModalProps = {
  status: TelegramNotificationStatus;
  triggerClassName?: string;
  triggerSize?: ComponentProps<typeof Button>["size"];
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  triggerIcon?: ReactNode;
  iconOnly?: boolean;
  triggerAriaLabel?: string;
};

export const TelegramTemplateBuilderModal = ({
  status,
  triggerClassName,
  triggerSize = "sm",
  triggerVariant = "outline",
  triggerIcon,
  iconOnly = false,
  triggerAriaLabel,
}: TelegramTemplateBuilderModalProps) => {
  const isDesktop = useBreakpoint("md");
  const [open, setOpen] = useState(false);
  const { mutate: sendTestNotification, isPending: isSendingTest } =
    useSendTelegramTestNotification();

  const handleSendTestNotification = () => {
    sendTestNotification(undefined, {
      onSuccess: () => {
        track("notifications_test_sent", { channel: "telegram" });
        toast.success(m.settings_notifications_telegram_testSent());
      },
      onError: () => {
        toast.error(m.settings_notifications_telegram_testFailed());
      },
    });
  };

  const testButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleSendTestNotification}
      disabled={!status.linked || isSendingTest}
      title={
        status.linked
          ? undefined
          : m.settings_notifications_telegram_template_connectHint()
      }
      className="shrink-0"
    >
      <FlaskConical className="size-4" />
      {isSendingTest
        ? m.settings_notifications_telegram_testSending()
        : m.settings_notifications_telegram_test()}
    </Button>
  );

  const content = (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
      <TelegramTemplateBuilderCard
        key={status.messageTemplate.template}
        status={status}
        withContainer={false}
        showHeader={false}
      />
    </div>
  );

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        aria-label={triggerAriaLabel}
        onClick={() => {
          setOpen(true);
          track("notifications_template_builder_opened");
        }}
      >
        {triggerIcon}
        {iconOnly ? (
          <span className="sr-only">
            {m.settings_notifications_telegram_template_open()}
          </span>
        ) : (
          m.settings_notifications_telegram_template_open()
        )}
      </Button>

      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="flex h-[88vh] max-h-[88vh] flex-col gap-0 overflow-hidden md:max-w-[95vw] xl:max-w-7xl">
            <DialogHeader className="border-b px-4 py-3 text-left md:px-6 md:py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-1">
                  <DialogTitle>
                    {m.settings_notifications_telegram_template_modalTitle()}
                  </DialogTitle>
                  <DialogDescription>
                    {m.settings_notifications_telegram_template_modalDescription()}
                  </DialogDescription>
                </div>
                {testButton}
              </div>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="h-[90vh]">
            <DrawerHeader className="border-b text-left">
              <div className="flex flex-col gap-3">
                <div className="space-y-1">
                  <DrawerTitle>
                    {m.settings_notifications_telegram_template_modalTitle()}
                  </DrawerTitle>
                  <DrawerDescription>
                    {m.settings_notifications_telegram_template_modalDescription()}
                  </DrawerDescription>
                </div>
                {testButton}
              </div>
            </DrawerHeader>
            {content}
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};
