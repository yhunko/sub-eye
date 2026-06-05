import { randomBytes } from "node:crypto";

export const TELEGRAM_LINK_PAYLOAD_PREFIX = "link_";
export const TELEGRAM_START_PAYLOAD_MAX_LENGTH = 64;

export const createTelegramLinkPayload = (): string => {
  const rawToken = randomBytes(24).toString("hex");
  const payload = `${TELEGRAM_LINK_PAYLOAD_PREFIX}${rawToken}`;

  if (payload.length > TELEGRAM_START_PAYLOAD_MAX_LENGTH) {
    throw new Error("Telegram link payload exceeded 64 characters");
  }

  return payload;
};

export const extractTelegramRawToken = (payload: string): string => {
  if (!payload.startsWith(TELEGRAM_LINK_PAYLOAD_PREFIX)) {
    throw new Error("Invalid link payload");
  }

  const rawToken = payload.slice(TELEGRAM_LINK_PAYLOAD_PREFIX.length).trim();
  const isTokenValid = /^[a-f0-9]+$/i.test(rawToken);

  if (!isTokenValid || rawToken.length < 32) {
    throw new Error("Invalid link token");
  }

  return rawToken;
};
