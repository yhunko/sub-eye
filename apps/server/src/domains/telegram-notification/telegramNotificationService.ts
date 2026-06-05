import { TelegramBotService } from "@subeye/notifications/telegram";
import {
  CurrencyUtils,
  DateTimezoneUtils,
  hasPlanFeature,
  type PushNotificationPayload,
  type TelegramLinkStartResponse,
  type TelegramMessageTemplate,
  type TelegramNotificationStatus,
  type TelegramSendReport,
} from "@subeye/shared";
import { CurrencyService } from "../currency/currencyService";
import { UserService } from "../user/userService";
import {
  createTelegramLinkPayload,
  extractTelegramRawToken,
} from "./telegramLinkPayload";
import type { TelegramTemplateRenderContext } from "./telegramMessageTemplateService";
import { TelegramMessageTemplateService } from "./telegramMessageTemplateService";
import { getTelegramNotificationCopy } from "./telegramNotificationCopy";
import {
  type TelegramLinkRecord,
  TelegramNotificationRepository,
} from "./telegramNotificationRepository";

const LINK_TOKEN_EXPIRATION_MINUTES = 15;
const SAMPLE_PRICE_AMOUNT = 9.99;
const SAMPLE_PRICE_CURRENCY = "usd";

export const TELEGRAM_TEMPLATE_PLUS_REQUIRED_ERROR =
  "Telegram message template is available on Plus plan";
export const TELEGRAM_TEMPLATE_NOT_LINKED_ERROR = "Telegram is not linked";

const TELEGRAM_TEMPLATE_INVALID_VARIABLES_PREFIX =
  "Unsupported template variables:";

type LinkFromStartPayloadInput = {
  payload: string;
  chatId: string;
  telegramUserId: string;
  telegramUsername?: string | null;
};

type TelegramTemplateContextPayload = {
  kind: "renewal";
  subscriptionName: string;
  renewalDate: string;
  timezone: string;
  preferredPrice: {
    amount: number;
    currencyCode: string;
  };
  originalPrice: {
    amount: number;
    currencyCode: string;
  };
};

type TelegramActionButton = {
  text: string;
  url: string;
};

export class TelegramNotificationService {
  static async getStatus(userId: string): Promise<TelegramNotificationStatus> {
    const [link, preferences] = await Promise.all([
      TelegramNotificationRepository.findLinkByUserId(userId),
      UserService.getUserPreferences(userId),
    ]);

    const defaultMessageTemplate =
      TelegramMessageTemplateService.getDefaultTemplate(preferences.locale);
    const customTemplate = link
      ? TelegramMessageTemplateService.parseStoredTemplate(link.messageTemplate)
      : null;

    if (!link) {
      return {
        linked: false,
        enabled: false,
        botUsername: TelegramBotService.getBotUsername(),
        accountLabel: null,
        messageTemplate: defaultMessageTemplate,
        defaultMessageTemplate,
        isCustomTemplate: false,
      };
    }

    return {
      linked: true,
      enabled: link.isEnabled,
      botUsername: TelegramBotService.getBotUsername(),
      accountLabel: TelegramNotificationService.buildAccountLabel(
        link.telegramUsername,
        link.chatId,
      ),
      messageTemplate: customTemplate ?? defaultMessageTemplate,
      defaultMessageTemplate,
      isCustomTemplate: customTemplate !== null,
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

    return TelegramNotificationService.getStatus(userId);
  }

  static async updateMessageTemplate(
    userId: string,
    messageTemplate: TelegramMessageTemplate,
  ): Promise<TelegramNotificationStatus> {
    const planId = await UserService.getPlanId(userId);

    if (!hasPlanFeature(planId, "telegramMessageTemplate")) {
      throw new Error(TELEGRAM_TEMPLATE_PLUS_REQUIRED_ERROR);
    }

    const validation =
      TelegramMessageTemplateService.validateTemplate(messageTemplate);

    if (!validation.valid) {
      throw new Error(
        `${TELEGRAM_TEMPLATE_INVALID_VARIABLES_PREFIX} ${validation.invalidVariables.join(", ")}`,
      );
    }

    const updated =
      await TelegramNotificationRepository.updateMessageTemplateByUserId(
        userId,
        messageTemplate,
      );

    if (!updated) {
      throw new Error(TELEGRAM_TEMPLATE_NOT_LINKED_ERROR);
    }

    return TelegramNotificationService.getStatus(userId);
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

    await TelegramNotificationService.disconnectByUserId(link.userId);
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
    const preferences = await UserService.getUserPreferences(userId);
    const copy = getTelegramNotificationCopy(preferences.locale);
    const sampleContext =
      await TelegramNotificationService.buildSampleTemplateContext(userId);

    return TelegramNotificationService.sendMessageToLinkedUser(
      userId,
      (link) =>
        TelegramNotificationService.renderMessageFromActiveTemplate(
          userId,
          link,
          preferences.locale,
          sampleContext,
        ),
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
    const linkUrl = TelegramNotificationService.resolveAbsoluteUrl(dataUrl);
    const fallbackMessage = [payload.title, payload.body]
      .filter(Boolean)
      .join("\n");

    const templateContext =
      TelegramNotificationService.extractTemplateContextFromPayload(payload);

    return TelegramNotificationService.sendMessageToLinkedUser(
      userId,
      (link) => {
        if (!templateContext) {
          return fallbackMessage;
        }

        return TelegramNotificationService.renderMessageFromActiveTemplate(
          userId,
          link,
          locale,
          {
            subscriptionName: templateContext.subscriptionName,
            renewalDate: templateContext.renewalDate,
            referenceDate: DateTimezoneUtils.now(templateContext.timezone),
            timezone: templateContext.timezone,
            preferredPrice: {
              amount: templateContext.preferredPrice.amount,
              currencyCode: templateContext.preferredPrice.currencyCode,
            },
            originalPrice: {
              amount: templateContext.originalPrice.amount,
              currencyCode: templateContext.originalPrice.currencyCode,
            },
          },
        );
      },
      linkUrl,
      copy.openSubEyeButton,
    );
  }

  static async sendExpiryNotification(
    userId: string,
    payload: PushNotificationPayload,
    locale?: string,
  ): Promise<TelegramSendReport> {
    const copy = getTelegramNotificationCopy(locale);
    const dataUrl =
      payload.data && typeof payload.data.url === "string"
        ? payload.data.url
        : null;
    const subscriptionUrl =
      TelegramNotificationService.resolveAbsoluteUrl(dataUrl);
    const settingsUrl = TelegramBotService.getSettingsUrl();
    const messageText = [payload.title, payload.body]
      .filter(Boolean)
      .join("\n");

    const buttons: TelegramActionButton[] = [];
    if (subscriptionUrl) {
      buttons.push({
        text: copy.viewSubscriptionButton,
        url: subscriptionUrl,
      });
    }
    if (settingsUrl) {
      buttons.push({
        text: copy.notificationSettingsButton,
        url: settingsUrl,
      });
    }

    return TelegramNotificationService.sendMessageWithButtons(
      userId,
      messageText,
      buttons,
    );
  }

  private static async buildSampleTemplateContext(
    userId: string,
  ): Promise<TelegramTemplateRenderContext> {
    const preferences = await UserService.getUserPreferences(userId);
    const rates = await CurrencyService.getRates(preferences.preferredCurrency);
    const preferredAmount = CurrencyUtils.convert(
      SAMPLE_PRICE_AMOUNT,
      SAMPLE_PRICE_CURRENCY,
      preferences.preferredCurrency,
      rates,
    );
    const now = DateTimezoneUtils.now(preferences.preferredTimezone);
    const renewalDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return {
      subscriptionName: "1Password",
      renewalDate,
      referenceDate: now,
      timezone: preferences.preferredTimezone,
      preferredPrice: {
        amount: preferredAmount,
        currencyCode: preferences.preferredCurrency,
      },
      originalPrice: {
        amount: SAMPLE_PRICE_AMOUNT,
        currencyCode: SAMPLE_PRICE_CURRENCY,
      },
    };
  }

  private static async renderMessageFromActiveTemplate(
    userId: string,
    link: TelegramLinkRecord,
    locale: string | undefined,
    context: TelegramTemplateRenderContext,
  ): Promise<string> {
    const defaultTemplate =
      TelegramMessageTemplateService.getDefaultTemplate(locale);
    const storedTemplate = TelegramMessageTemplateService.parseStoredTemplate(
      link.messageTemplate,
    );
    const planId = await UserService.getPlanId(userId);
    const canUseCustomTemplate = hasPlanFeature(
      planId,
      "telegramMessageTemplate",
    );
    const activeTemplate =
      canUseCustomTemplate && storedTemplate ? storedTemplate : defaultTemplate;

    return TelegramMessageTemplateService.renderTemplate(
      activeTemplate,
      context,
      locale,
    );
  }

  private static extractTemplateContextFromPayload(
    payload: PushNotificationPayload,
  ): TelegramTemplateContextPayload | null {
    const data = payload.data;

    if (!data || typeof data !== "object") {
      return null;
    }

    const raw = (data as Record<string, unknown>).telegramTemplateContext;

    if (!raw || typeof raw !== "object") {
      return null;
    }

    const value = raw as Record<string, unknown>;

    if (value.kind !== "renewal") {
      return null;
    }

    const subscriptionName = value.subscriptionName;
    const renewalDate = value.renewalDate;
    const timezone = value.timezone;
    const preferredPrice = value.preferredPrice;
    const originalPrice = value.originalPrice;

    if (
      typeof subscriptionName !== "string" ||
      typeof renewalDate !== "string" ||
      typeof timezone !== "string" ||
      !TelegramNotificationService.isPriceValue(preferredPrice) ||
      !TelegramNotificationService.isPriceValue(originalPrice)
    ) {
      return null;
    }

    return {
      kind: "renewal",
      subscriptionName,
      renewalDate,
      timezone,
      preferredPrice,
      originalPrice,
    };
  }

  private static isPriceValue(
    value: unknown,
  ): value is TelegramTemplateContextPayload["preferredPrice"] {
    if (!value || typeof value !== "object") {
      return false;
    }

    const candidate = value as Record<string, unknown>;

    return (
      typeof candidate.currencyCode === "string" &&
      typeof candidate.amount === "number" &&
      Number.isFinite(candidate.amount)
    );
  }

  private static async sendMessageToLinkedUser(
    userId: string,
    messageText:
      | string
      | ((link: TelegramLinkRecord) => string | Promise<string>),
    buttonUrl: string | null,
    buttonText: string,
  ): Promise<TelegramSendReport> {
    const buttons: TelegramActionButton[] =
      buttonUrl && buttonText ? [{ text: buttonText, url: buttonUrl }] : [];
    return TelegramNotificationService.sendMessageWithButtons(
      userId,
      messageText,
      buttons,
    );
  }

  private static async sendMessageWithButtons(
    userId: string,
    messageText:
      | string
      | ((link: TelegramLinkRecord) => string | Promise<string>),
    buttons: TelegramActionButton[],
  ): Promise<TelegramSendReport> {
    const link = await TelegramNotificationRepository.findLinkByUserId(userId);

    if (!link) {
      return {
        attempted: 0,
        delivered: 0,
        failed: 0,
        skipped: 1,
        reason: TELEGRAM_TEMPLATE_NOT_LINKED_ERROR,
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

    const resolvedMessage =
      typeof messageText === "function" ? await messageText(link) : messageText;

    const result = await TelegramBotService.sendMessage(
      link.chatId,
      resolvedMessage,
      {
        buttons,
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
  ): string {
    const normalizedUsername = username?.trim();

    if (normalizedUsername) {
      const plain = normalizedUsername.startsWith("@")
        ? normalizedUsername.slice(1)
        : normalizedUsername;
      const masked =
        plain.length <= 4
          ? `${plain[0] ?? "*"}***`
          : `${plain.slice(0, 2)}***${plain.slice(-2)}`;
      return `@${masked}`;
    }

    const visibleChatTail = chatId.slice(-4);
    return `Chat •••${visibleChatTail}`;
  }
}
