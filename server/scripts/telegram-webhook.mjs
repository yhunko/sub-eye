#!/usr/bin/env bun

import { randomBytes } from "node:crypto";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

const TELEGRAM_API_BASE = "https://api.telegram.org";
const DEFAULT_WEBHOOK_PATH = "/api/webhooks/telegram";

const command = process.argv[2] ?? "help";
const args = parseArgs(process.argv.slice(3));

if (args.help || command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

switch (command) {
  case "info":
    await printWebhookInfo(resolveBotToken(args));
    break;
  case "set":
    await runSetCommand(args);
    break;
  case "delete":
    await runDeleteCommand(args);
    break;
  case "secret":
    printGeneratedSecret(args);
    break;
  case "wizard":
    await runWizard(args);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}

async function runSetCommand(parsedArgs) {
  const token = resolveBotToken(parsedArgs);
  const baseUrl = requiredValue(
    "base URL (--base-url or TELEGRAM_WEBHOOK_BASE_URL)",
    resolveBaseUrl(parsedArgs),
  );
  const secret = requiredValue(
    "TELEGRAM_WEBHOOK_SECRET_TOKEN",
    parsedArgs.secret ?? process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
  );
  const webhookPath = normalizePath(
    parsedArgs.path ?? process.env.TELEGRAM_WEBHOOK_PATH ?? DEFAULT_WEBHOOK_PATH,
  );
  const dropPendingUpdates = parseBoolean(parsedArgs["drop-pending"], true);

  await applyWebhook({
    token,
    baseUrl,
    secret,
    webhookPath,
    dropPendingUpdates,
  });
}

async function runDeleteCommand(parsedArgs) {
  const token = resolveBotToken(parsedArgs);
  const dropPendingUpdates = parseBoolean(parsedArgs["drop-pending"], true);

  const deleteResult = await callTelegramApi(token, "deleteWebhook", {
    method: "POST",
    body: {
      drop_pending_updates: dropPendingUpdates,
    },
  });

  console.log("Webhook delete response:");
  console.log(JSON.stringify(deleteResult, null, 2));
  console.log("Current webhook info:");
  await printWebhookInfo(token);
}

function printGeneratedSecret(parsedArgs) {
  const envName = normalizeEnvName(
    String(parsedArgs.env ?? parsedArgs.environment ?? "env"),
  );
  const secret = generateWebhookSecret(envName);

  console.log(`Generated secret (${envName}):`);
  console.log(secret);
}

async function runWizard(parsedArgs) {
  if (!input.isTTY || !output.isTTY) {
    throw new Error("Wizard requires an interactive terminal (TTY)");
  }

  const rl = createInterface({ input, output });

  try {
    console.log("Telegram webhook setup wizard\n");

    const defaultEnv = normalizeEnvName(
      String(parsedArgs.env ?? parsedArgs.environment ?? "dev"),
    );
    const envName = await promptValue(rl, {
      label: "Environment label",
      defaultValue: defaultEnv,
    });
    const baseUrl = await promptValue(rl, {
      label: "Public webhook base URL (https://...)",
      defaultValue: String(resolveBaseUrl(parsedArgs) ?? ""),
    });
    const token = await promptSecret(
      rl,
      "Telegram bot token",
      parsedArgs.token ?? process.env.TELEGRAM_BOT_TOKEN,
    );
    const botUsername = normalizeBotUsername(
      await promptValue(rl, {
        label: "Bot username (optional, without @)",
        defaultValue: String(
          parsedArgs.username ?? process.env.TELEGRAM_BOT_USERNAME ?? "",
        ),
        required: false,
      }),
    );
    const path = normalizePath(
      String(
        parsedArgs.path ?? process.env.TELEGRAM_WEBHOOK_PATH ?? DEFAULT_WEBHOOK_PATH,
      ),
    );

    const generateSecret = await askYesNo(
      rl,
      "Generate a new webhook secret token?",
      true,
    );

    const secret = generateSecret
      ? generateWebhookSecret(envName)
      : await promptSecret(
          rl,
          "Webhook secret token",
          parsedArgs.secret ?? process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
        );

    if (generateSecret) {
      console.log(`Generated secret: ${secret}`);
    }

    const dropPendingUpdates = await askYesNo(
      rl,
      "Drop pending Telegram updates when setting webhook?",
      parseBoolean(parsedArgs["drop-pending"], true),
    );

    const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
    if (!normalizedBaseUrl.startsWith("https://")) {
      throw new Error("Webhook base URL must use https://");
    }
    const webhookUrl = `${normalizedBaseUrl}${path}`;

    console.log("\nSummary:");
    console.log(`- Environment: ${envName}`);
    console.log(`- Webhook URL: ${webhookUrl}`);
    console.log(`- Bot token: ${maskSecret(token)}`);
    console.log(
      `- Secret token: ${maskSecret(secret)} ${generateSecret ? "(generated)" : "(manual)"}`,
    );
    console.log(`- Drop pending updates: ${dropPendingUpdates}`);
    if (botUsername) {
      console.log(`- Bot username: ${botUsername}`);
    }

    const proceed = await askYesNo(rl, "Apply setWebhook now?", true);
    if (!proceed) {
      console.log("Aborted.");
      return;
    }

    await applyWebhook({
      token,
      baseUrl,
      secret,
      webhookPath: path,
      dropPendingUpdates,
    });

    printEnvBlock({
      token,
      botUsername,
      secret,
      baseUrl: normalizedBaseUrl,
      envName,
    });
  } finally {
    rl.close();
  }
}

async function applyWebhook(config) {
  const normalizedBaseUrl = normalizeBaseUrl(config.baseUrl);

  if (!normalizedBaseUrl.startsWith("https://")) {
    throw new Error("Webhook base URL must use https://");
  }

  const webhookUrl = `${normalizedBaseUrl}${config.webhookPath}`;
  const setResult = await callTelegramApi(config.token, "setWebhook", {
    method: "POST",
    body: {
      url: webhookUrl,
      secret_token: config.secret,
      drop_pending_updates: config.dropPendingUpdates,
    },
  });

  console.log("Webhook set response:");
  console.log(JSON.stringify(setResult, null, 2));
  console.log(`\nConfigured webhook URL: ${webhookUrl}`);
  console.log("Current webhook info:");
  await printWebhookInfo(config.token);
}

function printEnvBlock(config) {
  console.log("\nSuggested env values:");
  console.log(`TELEGRAM_BOT_TOKEN=${config.token}`);
  if (config.botUsername) {
    console.log(`TELEGRAM_BOT_USERNAME=${config.botUsername}`);
  }
  console.log(`TELEGRAM_WEBHOOK_SECRET_TOKEN=${config.secret}`);
  console.log(`TELEGRAM_WEBHOOK_BASE_URL=${config.baseUrl}`);
  console.log(`TELEGRAM_PUBLIC_BASE_URL=${config.baseUrl}`);
  console.log(`\n# Environment label used: ${config.envName}`);
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

function resolveBotToken(parsedArgs) {
  return requiredValue(
    "TELEGRAM_BOT_TOKEN",
    parsedArgs.token ?? process.env.TELEGRAM_BOT_TOKEN,
  );
}

function resolveBaseUrl(parsedArgs) {
  return (
    parsedArgs["base-url"] ??
    parsedArgs.baseUrl ??
    process.env.TELEGRAM_WEBHOOK_BASE_URL ??
    process.env.TELEGRAM_PUBLIC_BASE_URL ??
    process.env.BASE_URL
  );
}

function generateWebhookSecret(envName) {
  const prefix = normalizeEnvName(envName);
  const randomPart = randomBytes(24).toString("base64url");
  return `${prefix}_${randomPart}`;
}

function normalizeEnvName(value) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const collapsed = normalized.replace(/^_+|_+$/g, "");
  return collapsed || "env";
}

function normalizeBotUsername(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
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

async function promptValue(
  rl,
  { label, defaultValue = "", required = true, showDefault = true },
) {
  while (true) {
    const defaultSuffix =
      defaultValue && showDefault ? ` [${String(defaultValue)}]` : "";
    const response = (await rl.question(`${label}${defaultSuffix}: `)).trim();
    const value = response || String(defaultValue ?? "");

    if (value || !required) {
      return value.trim();
    }

    console.log("Value is required.");
  }
}

async function promptSecret(rl, label, defaultValue) {
  const hasDefault = typeof defaultValue === "string" && defaultValue.trim().length > 0;

  if (hasDefault) {
    const useDefault = await askYesNo(
      rl,
      `Use ${label} from current environment?`,
      true,
    );

    if (useDefault) {
      return defaultValue.trim();
    }
  }

  return promptValue(rl, {
    label: `${label} (input visible)`,
    required: true,
    showDefault: false,
  });
}

async function askYesNo(rl, question, defaultValue) {
  const suffix = defaultValue ? " [Y/n]" : " [y/N]";

  while (true) {
    const answer = (await rl.question(`${question}${suffix}: `))
      .trim()
      .toLowerCase();

    if (!answer) {
      return defaultValue;
    }

    if (["y", "yes"].includes(answer)) {
      return true;
    }

    if (["n", "no"].includes(answer)) {
      return false;
    }

    console.log("Please answer yes or no.");
  }
}

function maskSecret(value) {
  const trimmed = value.trim();

  if (trimmed.length <= 6) {
    return "***";
  }

  return `${trimmed.slice(0, 3)}***${trimmed.slice(-3)}`;
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
  bun run telegram:webhook:secret --env dev
  bun run telegram:webhook:wizard

Generic form:
  bun run telegram:webhook <info|set|delete|secret|wizard> [options]

Required environment:
  TELEGRAM_BOT_TOKEN for info/set/delete (wizard can prompt)

Set command requires:
  TELEGRAM_WEBHOOK_SECRET_TOKEN (or --secret)
  webhook base URL via:
    --base-url
    TELEGRAM_WEBHOOK_BASE_URL
    TELEGRAM_PUBLIC_BASE_URL
    BASE_URL

Options:
  --token <value>         Override TELEGRAM_BOT_TOKEN
  --secret <value>        Override TELEGRAM_WEBHOOK_SECRET_TOKEN (set/wizard)
  --base-url <value>      Public HTTPS base URL (set/wizard)
  --path <value>          Webhook path (default: ${DEFAULT_WEBHOOK_PATH})
  --drop-pending <bool>   true/false (default: true)
  --env <value>           Environment label used for secret generation
  --username <value>      Bot username hint for wizard output
  --help                  Show this message
`);
}
