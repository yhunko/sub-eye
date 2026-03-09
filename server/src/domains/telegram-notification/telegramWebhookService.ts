import {
  parseTelegramWebhookCommand,
  type TelegramWebhookCommand,
} from "./telegramWebhookCommand";
import { TelegramBotService } from "./telegramBotService";
import { getTelegramNotificationCopy } from "./telegramNotificationCopy";
import { TelegramNotificationService } from "./telegramNotificationService";

export type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: {
      id: number;
      type: string;
    };
    from?: {
      id: number;
      username?: string;
    };
  };
};

type TelegramWebhookDependencies = {
  getSettingsUrl: () => string | null;
  parseCommand: (text: string | undefined) => TelegramWebhookCommand;
  sendMessage: typeof TelegramBotService.sendMessage;
  getLinkedUserIdByChatId: typeof TelegramNotificationService.getLinkedUserIdByChatId;
  getUserLocale: typeof TelegramNotificationService.getUserLocale;
  disconnectByChatId: typeof TelegramNotificationService.disconnectByChatId;
  linkFromStartPayload: typeof TelegramNotificationService.linkFromStartPayload;
  sendTestNotification: typeof TelegramNotificationService.sendTestNotification;
};

const telegramWebhookDependencies: TelegramWebhookDependencies = {
  getSettingsUrl: TelegramBotService.getSettingsUrl,
  parseCommand: parseTelegramWebhookCommand,
  sendMessage: TelegramBotService.sendMessage,
  getLinkedUserIdByChatId: TelegramNotificationService.getLinkedUserIdByChatId,
  getUserLocale: TelegramNotificationService.getUserLocale,
  disconnectByChatId: TelegramNotificationService.disconnectByChatId,
  linkFromStartPayload: TelegramNotificationService.linkFromStartPayload,
  sendTestNotification: TelegramNotificationService.sendTestNotification,
};

export class TelegramWebhookService {
  static async processUpdate(
    payload: TelegramUpdate,
    deps: TelegramWebhookDependencies = telegramWebhookDependencies,
  ): Promise<void> {
    if (!payload.message?.chat) {
      return;
    }

    const chatId = String(payload.message.chat.id);
    const command = deps.parseCommand(payload.message.text);
    const defaultCopy = getTelegramNotificationCopy();

    if (payload.message.chat.type !== "private") {
      await deps.sendMessage(chatId, defaultCopy.privateChatPrompt);
      return;
    }

    if (command.type === "none") {
      return;
    }

    const linkedUserId = await deps.getLinkedUserIdByChatId(chatId);
    const locale = linkedUserId
      ? await deps.getUserLocale(linkedUserId).catch(() => undefined)
      : undefined;
    const copy = getTelegramNotificationCopy(locale);
    const settingsUrl = deps.getSettingsUrl();
    const settingsButtons = settingsUrl
      ? [{ text: copy.openSettingsButton, url: settingsUrl }]
      : [];

    if (command.type === "start") {
      const payloadPart = command.payload;

      if (payloadPart?.startsWith("link_")) {
        await this.handleLinkStartCommand(
          chatId,
          payload,
          payloadPart,
          copy,
          deps,
        );
        return;
      }

      await deps.sendMessage(chatId, copy.connectInstructions, {
        buttons: settingsButtons,
      });
      return;
    }

    if (command.type === "stop") {
      const disconnected = await deps.disconnectByChatId(chatId);

      await deps.sendMessage(
        chatId,
        disconnected ? copy.disconnected : copy.noLinkedAccount,
        { buttons: settingsButtons },
      );
      return;
    }

    if (command.type === "settings") {
      await deps.sendMessage(
        chatId,
        settingsUrl ? copy.settingsPrompt : copy.settingsNotConfigured,
        { buttons: settingsButtons },
      );
      return;
    }

    await deps.sendMessage(chatId, copy.supportedCommands);
  }

  private static async handleLinkStartCommand(
    chatId: string,
    payload: TelegramUpdate,
    payloadPart: string,
    fallbackCopy: ReturnType<typeof getTelegramNotificationCopy>,
    deps: TelegramWebhookDependencies,
  ): Promise<void> {
    let copy = fallbackCopy;

    try {
      const telegramUserId = payload.message?.from?.id;

      if (!telegramUserId) {
        throw new Error("Telegram user identity was not provided");
      }

      const linked = await deps.linkFromStartPayload({
        payload: payloadPart,
        chatId,
        telegramUserId: String(telegramUserId),
        telegramUsername: payload.message?.from?.username ?? null,
      });

      const locale = await deps
        .getUserLocale(linked.userId)
        .catch(() => undefined);
      copy = getTelegramNotificationCopy(locale);
      const settingsUrl = deps.getSettingsUrl();
      const settingsButtons = settingsUrl
        ? [{ text: copy.openSettingsButton, url: settingsUrl }]
        : [];

      await deps.sendMessage(chatId, copy.linkedSuccess, {
        buttons: settingsButtons,
      });

      await deps.sendTestNotification(linked.userId);
    } catch (error) {
      console.error("[Telegram Webhook] Link start failed", { error });

      const settingsUrl = deps.getSettingsUrl();
      const settingsButtons = settingsUrl
        ? [{ text: copy.openSettingsButton, url: settingsUrl }]
        : [];

      await deps.sendMessage(chatId, copy.connectFailed, {
        buttons: settingsButtons,
      });
    }
  }
}
