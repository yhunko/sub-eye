#!/usr/bin/env bun

const TELEGRAM_API_BASE = "https://api.telegram.org";
const DEFAULT_WEBHOOK_PATH = "/api/webhooks/telegram";

const command = process.argv[2] ?? "help";
const args = parseArgs(process.argv.slice(3));

if (args.help || command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

const token = requiredValue(
  "TELEGRAM_BOT_TOKEN",
  args.token ?? process.env.TELEGRAM_BOT_TOKEN,
);

switch (command) {
  case "info":
    await printWebhookInfo(token);
    break;
  case "set":
    await setWebhook(token, args);
    break;
  case "delete":
    await deleteWebhook(token, args);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}

async function setWebhook(tokenValue, parsedArgs) {
  const baseUrlRaw =
    parsedArgs["base-url"] ??
    parsedArgs.baseUrl ??
    process.env.TELEGRAM_WEBHOOK_BASE_URL ??
    process.env.TELEGRAM_PUBLIC_BASE_URL ??
    process.env.BASE_URL;

  const baseUrl = requiredValue(
    "base URL (--base-url or TELEGRAM_WEBHOOK_BASE_URL)",
    baseUrlRaw,
  );
  const secret = requiredValue(
    "TELEGRAM_WEBHOOK_SECRET_TOKEN",
    parsedArgs.secret ?? process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
  );
  const webhookPath = normalizePath(
    parsedArgs.path ?? process.env.TELEGRAM_WEBHOOK_PATH ?? DEFAULT_WEBHOOK_PATH,
  );
  const dropPendingUpdates = parseBoolean(parsedArgs["drop-pending"], true);

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  if (!normalizedBaseUrl.startsWith("https://")) {
    throw new Error("Webhook base URL must use https://");
  }

  const webhookUrl = `${normalizedBaseUrl}${webhookPath}`;
  const setResult = await callTelegramApi(tokenValue, "setWebhook", {
    method: "POST",
    body: {
      url: webhookUrl,
      secret_token: secret,
      drop_pending_updates: dropPendingUpdates,
    },
  });

  console.log("Webhook set response:");
  console.log(JSON.stringify(setResult, null, 2));
  console.log(`\nConfigured webhook URL: ${webhookUrl}`);
  console.log("Current webhook info:");
  await printWebhookInfo(tokenValue);
}

async function deleteWebhook(tokenValue, parsedArgs) {
  const dropPendingUpdates = parseBoolean(parsedArgs["drop-pending"], true);

  const deleteResult = await callTelegramApi(tokenValue, "deleteWebhook", {
    method: "POST",
    body: {
      drop_pending_updates: dropPendingUpdates,
    },
  });

  console.log("Webhook delete response:");
  console.log(JSON.stringify(deleteResult, null, 2));
  console.log("Current webhook info:");
  await printWebhookInfo(tokenValue);
}

async function printWebhookInfo(tokenValue) {
  const info = await callTelegramApi(tokenValue, "getWebhookInfo");
  console.log(JSON.stringify(info, null, 2));
}

async function callTelegramApi(tokenValue, methodName, options = {}) {
  const endpoint = `${TELEGRAM_API_BASE}/bot${tokenValue}/${methodName}`;
  const response = await fetch(endpoint, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `Telegram API request failed (${response.status}): ${safeStringify(payload)}`,
    );
  }

  if (!payload || payload.ok !== true) {
    throw new Error(`Telegram API returned error: ${safeStringify(payload)}`);
  }

  return payload.result;
}

function requiredValue(label, value) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new Error(`Missing required value: ${label}`);
  }

  return normalized;
}

function normalizeBaseUrl(value) {
  const trimmed = value.trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function normalizePath(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return DEFAULT_WEBHOOK_PATH;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function parseBoolean(value, defaultValue) {
  if (value == null) {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(
    `Invalid boolean value "${value}". Use true/false for --drop-pending.`,
  );
}

function parseArgs(rawArgs) {
  const output = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const current = rawArgs[index];

    if (!current.startsWith("--")) {
      continue;
    }

    const withoutPrefix = current.slice(2);
    const [key, inlineValue] = withoutPrefix.split("=", 2);

    if (inlineValue !== undefined) {
      output[key] = inlineValue;
      continue;
    }

    const next = rawArgs[index + 1];

    if (!next || next.startsWith("--")) {
      output[key] = true;
      continue;
    }

    output[key] = next;
    index += 1;
  }

  return output;
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function printHelp() {
  console.log(`Telegram webhook helper

Usage:
  bun run telegram:webhook:info
  bun run telegram:webhook:set --base-url https://your-tunnel.ngrok-free.app
  bun run telegram:webhook:delete

Generic form:
  bun run telegram:webhook <info|set|delete> [options]

Required environment:
  TELEGRAM_BOT_TOKEN

Set command requires:
  TELEGRAM_WEBHOOK_SECRET_TOKEN (or --secret)
  webhook base URL via:
    --base-url
    TELEGRAM_WEBHOOK_BASE_URL
    TELEGRAM_PUBLIC_BASE_URL
    BASE_URL

Options:
  --token <value>         Override TELEGRAM_BOT_TOKEN
  --secret <value>        Override TELEGRAM_WEBHOOK_SECRET_TOKEN (set only)
  --base-url <value>      Public HTTPS base URL (set only)
  --path <value>          Webhook path (default: ${DEFAULT_WEBHOOK_PATH})
  --drop-pending <bool>   true/false (default: true)
  --help                  Show this message
`);
}
