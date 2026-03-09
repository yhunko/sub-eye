export type TelegramWebhookCommand =
  | { type: "none" }
  | { type: "start"; payload: string | null }
  | { type: "stop" }
  | { type: "settings" }
  | { type: "unknown" };

export const parseTelegramWebhookCommand = (
  text: string | undefined,
): TelegramWebhookCommand => {
  const trimmed = text?.trim();

  if (!trimmed || !trimmed.startsWith("/")) {
    return { type: "none" };
  }

  const [command, payload] = trimmed.split(/\s+/, 2);

  if (command === "/start") {
    return { type: "start", payload: payload ?? null };
  }

  if (command === "/stop") {
    return { type: "stop" };
  }

  if (command === "/settings") {
    return { type: "settings" };
  }

  return { type: "unknown" };
};
