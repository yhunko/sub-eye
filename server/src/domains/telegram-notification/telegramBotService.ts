type TelegramInlineKeyboardButton = {
  text: string;
  url: string;
};

type TelegramSendMessageOptions = {
  disableWebPagePreview?: boolean;
  buttons?: TelegramInlineKeyboardButton[];
};

type TelegramSendMessageResult =
  | { ok: true }
  | { ok: false; reason: string; status?: number };

type TelegramApiResponse<T> =
  | { ok: true; result: T }
  | { ok: false; description?: string; error_code?: number };

type TelegramSendMessageResponse = {
  message_id: number;
};

export class TelegramBotService {
  static getPublicBaseUrl(): string | null {
    const value =
      process.env.TELEGRAM_PUBLIC_BASE_URL?.trim() ??
      process.env.BASE_URL?.trim();

    if (!value) {
      return null;
    }

    return value.endsWith("/") ? value.slice(0, -1) : value;
  }

  static getBotUsername(): string | null {
    const value = process.env.TELEGRAM_BOT_USERNAME?.trim();

    if (!value) {
      return null;
    }

    return value.startsWith("@") ? value.slice(1) : value;
  }

  static buildDeepLink(payload: string): string | null {
    const username = this.getBotUsername();

    if (!username) {
      return null;
    }

    return `https://t.me/${username}?start=${encodeURIComponent(payload)}`;
  }

  static getSettingsUrl(): string | null {
    const baseUrl = this.getPublicBaseUrl();

    if (!baseUrl) {
      return null;
    }

    return `${baseUrl}/settings/notifications`;
  }

  static isHttpsUrl(url: string): boolean {
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  }

  static async sendMessage(
    chatId: string,
    text: string,
    options: TelegramSendMessageOptions = {},
  ): Promise<TelegramSendMessageResult> {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

    if (!token) {
      return { ok: false, reason: "TELEGRAM_BOT_TOKEN is not configured" };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const buttons = (options.buttons ?? []).filter((button) =>
      this.isHttpsUrl(button.url),
    );
    const hasButtons = buttons.length > 0;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: options.disableWebPagePreview ?? true,
        ...(hasButtons
          ? {
              reply_markup: {
                inline_keyboard: buttons.map((button) => [button]),
              },
            }
          : undefined),
      }),
    }).catch((error) => {
      const reason = error instanceof Error ? error.message : "Unknown error";
      return {
        ok: false,
        status: 0,
        text: async () => reason,
      } as Response;
    });

    if (!response.ok) {
      const reason = await response.text().catch(() => "");
      return {
        ok: false,
        reason: reason || "Failed to send telegram message",
        status: response.status,
      };
    }

    const payload =
      (await response.json()) as TelegramApiResponse<TelegramSendMessageResponse>;

    if (!payload.ok) {
      return {
        ok: false,
        reason: payload.description ?? "Telegram API returned an error",
        status: payload.error_code,
      };
    }

    return { ok: true };
  }
}
