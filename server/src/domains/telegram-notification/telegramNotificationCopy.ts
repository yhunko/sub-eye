type TelegramNotificationCopy = {
  openSubEyeButton: string;
  openSettingsButton: string;
  privateChatPrompt: string;
  connectInstructions: string;
  disconnected: string;
  noLinkedAccount: string;
  settingsPrompt: string;
  settingsNotConfigured: string;
  supportedCommands: string;
  linkedSuccess: string;
  connectFailed: string;
  testTitle: string;
  testBody: string;
};

const COPY_BY_LOCALE: Record<string, TelegramNotificationCopy> = {
  en: {
    openSubEyeButton: "Open SubEye",
    openSettingsButton: "Open Notification Settings",
    privateChatPrompt:
      "Please message me in a private chat to connect your SubEye account.",
    connectInstructions:
      "To connect this bot, open SubEye -> Settings -> Notifications -> Connect Telegram.",
    disconnected: "Telegram notifications are disconnected for this account.",
    noLinkedAccount: "No linked SubEye account found for this chat.",
    settingsPrompt: "Open SubEye notification settings:",
    settingsNotConfigured: "Notification settings link is not configured.",
    supportedCommands: "Supported commands: /start, /settings, /stop",
    linkedSuccess:
      "SubEye is now connected to this Telegram chat. Notifications are enabled.",
    connectFailed:
      "Could not connect account. Please try again from SubEye settings.",
    testTitle: "Test Notification",
    testBody: "If you see this, Telegram notifications are working.",
  },
  uk: {
    openSubEyeButton: "Відкрити SubEye",
    openSettingsButton: "Відкрити налаштування сповіщень",
    privateChatPrompt:
      "Щоб підключити акаунт SubEye, напишіть мені в приватному чаті.",
    connectInstructions:
      "Щоб підключити бота, відкрийте SubEye -> Налаштування -> Сповіщення -> Підключити Telegram.",
    disconnected: "Сповіщення Telegram для цього акаунта вимкнено.",
    noLinkedAccount: "Для цього чату не знайдено пов'язаного акаунта SubEye.",
    settingsPrompt: "Відкрийте налаштування сповіщень SubEye:",
    settingsNotConfigured:
      "Посилання на налаштування сповіщень не налаштовано.",
    supportedCommands: "Підтримувані команди: /start, /settings, /stop",
    linkedSuccess:
      "SubEye успішно підключено до цього чату Telegram. Сповіщення увімкнено.",
    connectFailed:
      "Не вдалося підключити акаунт. Спробуйте ще раз із налаштувань SubEye.",
    testTitle: "Тестове сповіщення",
    testBody: "Якщо ви бачите це повідомлення, сповіщення Telegram працюють.",
  },
};

export const getTelegramNotificationCopy = (
  locale?: string,
): TelegramNotificationCopy => {
  const normalizedLocale = normalizeLocale(locale);
  const base = normalizedLocale.split("-")[0];

  if (base && COPY_BY_LOCALE[base]) {
    return COPY_BY_LOCALE[base];
  }

  return COPY_BY_LOCALE.en!;
};

const normalizeLocale = (locale?: string): string => {
  if (!locale) {
    return "en";
  }

  try {
    return Intl.getCanonicalLocales(locale)[0] ?? "en";
  } catch {
    return "en";
  }
};
