export const TELEGRAM_CONNECT_TIMEOUT_MS = 60_000;

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
