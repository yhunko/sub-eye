import type {
  TelegramLinkStartResponse,
  TelegramNotificationStatus,
  TelegramSendReport,
} from "shared";
import type { PushNotificationPayload } from "shared";
import { UserService } from "../user/userService";
import { TelegramBotService } from "./telegramBotService";
import {
  createTelegramLinkPayload,
  extractTelegramRawToken,
} from "./telegramLinkPayload";
import { getTelegramNotificationCopy } from "./telegramNotificationCopy";
import { TelegramNotificationRepository } from "./telegramNotificationRepository";

const LINK_TOKEN_EXPIRATION_MINUTES = 15;

type LinkFromStartPayloadInput = {
  payload: string;
  chatId: string;
  telegramUserId: string;
  telegramUsername?: string | null;
};

export class TelegramNotificationService {
  static async getStatus(userId: string): Promise<TelegramNotificationStatus> {
    const link = await TelegramNotificationRepository.findLinkByUserId(userId);

    if (!link) {
      return {
        linked: false,
        enabled: false,
        botUsername: TelegramBotService.getBotUsername(),
        accountLabel: null,
      };
    }

    return {
      linked: true,
      enabled: link.isEnabled,
      botUsername: TelegramBotService.getBotUsername(),
      accountLabel: this.buildAccountLabel(
        link.telegramUsername,
        link.chatId,
        link.isEnabled,
      ),
    };
  }

  static async createLinkStart(
    userId: string,
  ): Promise<TelegramLinkStartResponse> {
    const connectPayload = createTelegramLinkPayload();
    const rawToken = extractTelegramRawToken(connectPayload);
    const expiresAt = new Date(
      Date.now() + LINK_TOKEN_EXPIRATION_MINUTES * 60 * 1000,
    );

    await TelegramNotificationRepository.deleteTokensByUserId(userId);
    await TelegramNotificationRepository.createToken({
      userId,
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
      consumedAt: null,
    });

    const connectUrl = TelegramBotService.buildDeepLink(connectPayload);
    const botUsername = TelegramBotService.getBotUsername();

    if (!connectUrl || !botUsername) {
      throw new Error(
        "Telegram bot is not configured. Expected TELEGRAM_BOT_USERNAME.",
      );
    }

    return {
      connectUrl,
      expiresAt: expiresAt.toISOString(),
      botUsername,
    };
  }

  static async linkFromStartPayload(
    input: LinkFromStartPayloadInput,
  ): Promise<{ userId: string }> {
    const rawToken = extractTelegramRawToken(input.payload);
    const consumedToken =
      await TelegramNotificationRepository.consumeValidToken(rawToken);

    if (!consumedToken) {
      throw new Error("Link token is invalid or expired");
    }

    const existingByChat =
      await TelegramNotificationRepository.findLinkByChatId(input.chatId);

    if (existingByChat && existingByChat.userId !== consumedToken.userId) {
      throw new Error(
        "This Telegram account is already linked to another user",
      );
    }

    await TelegramNotificationRepository.upsertLink({
      userId: consumedToken.userId,
      chatId: input.chatId,
      telegramUserId: input.telegramUserId,
      telegramUsername: input.telegramUsername ?? null,
      isEnabled: true,
    });

    await TelegramNotificationRepository.deleteTokensByUserId(
      consumedToken.userId,
    );

    return { userId: consumedToken.userId };
  }

  static async updatePreferences(
    userId: string,
    enabled: boolean,
  ): Promise<TelegramNotificationStatus> {
    await TelegramNotificationRepository.updateLinkEnabledByUserId(
      userId,
      enabled,
    );

    return this.getStatus(userId);
  }

  static async disconnectByUserId(userId: string): Promise<void> {
    await Promise.all([
      TelegramNotificationRepository.deleteLinkByUserId(userId),
      TelegramNotificationRepository.deleteTokensByUserId(userId),
    ]);
  }

  static async disconnectByChatId(chatId: string): Promise<boolean> {
    const link = await TelegramNotificationRepository.findLinkByChatId(chatId);

    if (!link) {
      return false;
    }

    await this.disconnectByUserId(link.userId);
    return true;
  }

  static async getLinkedUserIdByChatId(chatId: string): Promise<string | null> {
    const link = await TelegramNotificationRepository.findLinkByChatId(chatId);
    return link?.userId ?? null;
  }

  static async getUserLocale(userId: string): Promise<string> {
    const preferences = await UserService.getUserPreferences(userId);
    return preferences.locale;
  }

  static async deleteAllForUser(userId: string): Promise<void> {
    await TelegramNotificationRepository.deleteAllForUser(userId);
  }

  static async sendTestNotification(
    userId: string,
  ): Promise<TelegramSendReport> {
    const locale = await this.getUserLocale(userId);
    const copy = getTelegramNotificationCopy(locale);

    return this.sendMessageToLinkedUser(
      userId,
      `${copy.testTitle}\n${copy.testBody}`,
      TelegramBotService.getSettingsUrl(),
      copy.openSubEyeButton,
    );
  }

  static async sendPushPayloadAsTelegramMessage(
    userId: string,
    payload: PushNotificationPayload,
    locale?: string,
  ): Promise<TelegramSendReport> {
    const copy = getTelegramNotificationCopy(locale);
    const dataUrl =
      payload.data && typeof payload.data.url === "string"
        ? payload.data.url
        : null;
    const linkUrl = this.resolveAbsoluteUrl(dataUrl);
    const messageText = [payload.title, payload.body]
      .filter(Boolean)
      .join("\n");

    return this.sendMessageToLinkedUser(
      userId,
      messageText,
      linkUrl,
      copy.openSubEyeButton,
    );
  }

  private static async sendMessageToLinkedUser(
    userId: string,
    messageText: string,
    buttonUrl: string | null,
    buttonText: string,
  ): Promise<TelegramSendReport> {
    const link = await TelegramNotificationRepository.findLinkByUserId(userId);

    if (!link) {
      return {
        attempted: 0,
        delivered: 0,
        failed: 0,
        skipped: 1,
        reason: "Telegram is not linked",
      };
    }

    if (!link.isEnabled) {
      return {
        attempted: 0,
        delivered: 0,
        failed: 0,
        skipped: 1,
        reason: "Telegram notifications are disabled",
      };
    }

    const result = await TelegramBotService.sendMessage(
      link.chatId,
      messageText,
      {
        buttons: buttonUrl ? [{ text: buttonText, url: buttonUrl }] : [],
      },
    );

    if (!result.ok) {
      return {
        attempted: 1,
        delivered: 0,
        failed: 1,
        skipped: 0,
        reason: result.reason,
      };
    }

    return {
      attempted: 1,
      delivered: 1,
      failed: 0,
      skipped: 0,
    };
  }

  private static resolveAbsoluteUrl(
    relativeOrAbsolute: string | null,
  ): string | null {
    if (!relativeOrAbsolute) {
      return TelegramBotService.getSettingsUrl();
    }

    if (
      relativeOrAbsolute.startsWith("https://") ||
      relativeOrAbsolute.startsWith("http://")
    ) {
      return relativeOrAbsolute;
    }

    const baseUrl = TelegramBotService.getPublicBaseUrl();

    if (!baseUrl) {
      return null;
    }

    return `${baseUrl}${relativeOrAbsolute.startsWith("/") ? "" : "/"}${relativeOrAbsolute}`;
  }

  private static buildAccountLabel(
    username: string | null,
    chatId: string,
    isEnabled: boolean,
  ): string {
    const suffix = isEnabled ? "enabled" : "disabled";
    const normalizedUsername = username?.trim();

    if (normalizedUsername) {
      const plain = normalizedUsername.startsWith("@")
        ? normalizedUsername.slice(1)
        : normalizedUsername;
      const masked =
        plain.length <= 4
          ? `${plain[0] ?? "*"}***`
          : `${plain.slice(0, 2)}***${plain.slice(-2)}`;
      return `@${masked} (${suffix})`;
    }

    const visibleChatTail = chatId.slice(-4);
    return `Chat •••${visibleChatTail} (${suffix})`;
  }
}
