export const TELEGRAM_CONNECT_TIMEOUT_MS = 60_000;

export const getTelegramBotUrl = (
  botUsername: string | null | undefined,
): string | null => {
  if (!botUsername) {
    return null;
  }

  const normalized = botUsername.startsWith("@")
    ? botUsername.slice(1)
    : botUsername;

  if (!normalized) {
    return null;
  }

  return `https://t.me/${normalized}`;
};

export const isTelegramConnectTimedOut = (
  startedAt: number | null,
  now = Date.now(),
  timeoutMs = TELEGRAM_CONNECT_TIMEOUT_MS,
): boolean => {
  if (!startedAt) {
    return false;
  }

  return now - startedAt >= timeoutMs;
};
