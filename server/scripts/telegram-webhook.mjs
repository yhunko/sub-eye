#!/usr/bin/env bun

import { randomBytes } from "node:crypto";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

const TELEGRAM_API_BASE = "https://api.telegram.org";
const WEBHOOK_PATH = "/api/webhooks/telegram";

const ENV_PRESETS = {
  prod: {
    label: "prod",
    baseUrl: "https://app.subeye.cc",
    botUsername: "subeye_bot",
  },
  dev: {
    label: "dev",
    baseUrl: "https://dev.subeye.cc",
    botUsername: "subeye_dev_bot",
  },
};

const command = process.argv[2] ?? "help";
const arg = process.argv[3];

switch (command) {
  case "configure":
    await runConfigure(arg);
    break;
  case "info":
    await runInfo();
    break;
  case "delete":
    await runDelete();
    break;
  default:
    printHelp();
    if (command !== "help") process.exit(1);
}

// --- Commands ---

async function runConfigure(env) {
  const preset = ENV_PRESETS[env];

  if (!preset) {
    console.error(`Unknown environment: "${env}". Use "dev" or "prod".`);
    process.exit(1);
  }

  const rl = createInterface({ input, output });

  try {
    console.log(`\nConfiguring Telegram webhook for ${preset.label.toUpperCase()}\n`);
    console.log(`  Base URL : ${preset.baseUrl}`);
    console.log(`  Bot      : @${preset.botUsername}`);
    console.log(`  Path     : ${WEBHOOK_PATH}`);
    console.log();

    const token = await promptSecret(
      rl,
      "Telegram bot token  (from BotFather — @BotFather → /mybots → API Token)",
      process.env.TELEGRAM_BOT_TOKEN,
    );
    const secret = generateSecret(preset.label);

    console.log(`\nWebhook secret token (auto-generated): ${maskSecret(secret)}`);

    const proceed = await askYesNo(rl, "\nApply setWebhook now?", true);
    if (!proceed) {
      console.log("Aborted.");
      return;
    }

    await applyWebhook({ token, baseUrl: preset.baseUrl, secret });

    printEnvBlock({ token, secret, preset });
  } finally {
    rl.close();
  }
}

async function runInfo() {
  const token = requireEnvToken();
  const info = await telegramApi(token, "getWebhookInfo");
  console.log(JSON.stringify(info, null, 2));
}

async function runDelete() {
  const token = requireEnvToken();
  const rl = createInterface({ input, output });

  try {
    const proceed = await askYesNo(rl, "Delete webhook?", false);
    if (!proceed) {
      console.log("Aborted.");
      return;
    }

    await telegramApi(token, "deleteWebhook", { drop_pending_updates: true });
    console.log("Webhook deleted.");

    const info = await telegramApi(token, "getWebhookInfo");
    console.log(JSON.stringify(info, null, 2));
  } finally {
    rl.close();
  }
}

// --- Core logic ---

async function applyWebhook({ token, baseUrl, secret }) {
  const url = `${baseUrl}${WEBHOOK_PATH}`;

  await telegramApi(token, "setWebhook", {
    url,
    secret_token: secret,
    drop_pending_updates: true,
  });

  console.log(`\nWebhook set: ${url}`);

  const info = await telegramApi(token, "getWebhookInfo");
  if (info.last_error_message) {
    console.warn(`Warning: ${info.last_error_message}`);
  }
}

function printEnvBlock({ token, secret, preset }) {
  console.log("\n--- Cloudflare Worker secrets to set ---\n");
  console.log(`TELEGRAM_BOT_TOKEN=${token}`);
  console.log(`TELEGRAM_BOT_USERNAME=${preset.botUsername}`);
  console.log(`TELEGRAM_WEBHOOK_SECRET_TOKEN=${secret}`);
  console.log(`BASE_URL=${preset.baseUrl}`);
  console.log("\n--- Run these wrangler commands ---\n");
  console.log(`wrangler secret put TELEGRAM_BOT_TOKEN`);
  console.log(`wrangler secret put TELEGRAM_BOT_USERNAME`);
  console.log(`wrangler secret put TELEGRAM_WEBHOOK_SECRET_TOKEN`);
  console.log(`wrangler secret put BASE_URL`);
}

// --- Helpers ---

function generateSecret(envLabel) {
  return `${envLabel}_${randomBytes(24).toString("base64url")}`;
}

function requireEnvToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is not set in environment.");
    process.exit(1);
  }
  return token;
}

async function telegramApi(token, method, body) {
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    throw new Error(`Telegram API error [${method}]: ${JSON.stringify(data)}`);
  }

  return data.result;
}

async function promptSecret(rl, label, envValue) {
  if (envValue?.trim()) {
    const use = await askYesNo(rl, `Use ${label.split("(")[0].trim()} from environment?`, true);
    if (use) return envValue.trim();
  }
  return promptValue(rl, `${label} (input visible)`);
}

async function promptValue(rl, label) {
  while (true) {
    const value = (await rl.question(`${label}: `)).trim();
    if (value) return value;
    console.log("Required.");
  }
}

async function askYesNo(rl, question, defaultValue) {
  const hint = defaultValue ? "[Y/n]" : "[y/N]";
  while (true) {
    const answer = (await rl.question(`${question} ${hint}: `)).trim().toLowerCase();
    if (!answer) return defaultValue;
    if (answer === "y" || answer === "yes") return true;
    if (answer === "n" || answer === "no") return false;
    console.log("Please answer y or n.");
  }
}

function maskSecret(value) {
  if (value.length <= 6) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function printHelp() {
  console.log(`
Telegram webhook manager

Commands:
  configure <dev|prod>   Set up webhook and print required env vars
  info                   Show current webhook status (requires TELEGRAM_BOT_TOKEN in env)
  delete                 Remove webhook (requires TELEGRAM_BOT_TOKEN in env)

Examples:
  bun run telegram:webhook configure prod
  bun run telegram:webhook configure dev
  TELEGRAM_BOT_TOKEN=xxx bun run telegram:webhook info
`);
}
