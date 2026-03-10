## Server

Install dependencies:

```sh
bun install
```

Run server in development:

```sh
bun run dev
```

The API runs on http://localhost:3000.

### Required Environment Variables

- `CLIENT_ORIGIN`
- `BASE_URL`
- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_WEBHOOK_SECRET`
- `QSTASH_URL`
- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`
- `VAPID_SUBJECT`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET_TOKEN`
- `TELEGRAM_PUBLIC_BASE_URL` (optional, defaults to `BASE_URL`)

### Paddle Environment Variables

- `PADDLE_API_KEY` - Paddle API token (sandbox for dev, live for prod)
- `PADDLE_WEBHOOK_SECRET` - webhook endpoint secret from Paddle notifications
- `PADDLE_ENV` - `sandbox` or `live`
- `PADDLE_PLUS_PRODUCT_ID` - Paddle product ID for the Plus plan

Recommended Paddle API key permissions:

- `price.read`
- `customer.write`
- `transaction.write`
- `customer_portal_session.write`

Notes:

- `PADDLE_PLUS_PRODUCT_ID` is required in all environments.
- Configure `PADDLE_PLUS_PRODUCT_ID` in your Cloudflare environment.

### Telegram Bot Setup

Use separate bots per environment:

- Development bot: `subeye_dev_bot`
- Production bot: `subeye_prod_bot`

Set webhook endpoints:

- Dev: `https://dev.subeye.cc/api/webhooks/telegram`
- Prod: `https://app.subeye.cc/api/webhooks/telegram`

Use Bot API `setWebhook` with:

- `secret_token` = `TELEGRAM_WEBHOOK_SECRET_TOKEN`
- `drop_pending_updates` = `true` on first setup or reconfiguration

### Reconnect Telegram Webhook When ngrok URL Changes

Telegram supports only one webhook URL per bot token. Every time your ngrok
URL changes, you must call `setWebhook` again for that bot.

Use the local helper script from `server/scripts/telegram-webhook.mjs`.

1. Pick the bot for the current environment.
2. Set required environment variables:

```sh
export TELEGRAM_BOT_TOKEN="<telegram-bot-token>"
export TELEGRAM_WEBHOOK_SECRET_TOKEN="<telegram-webhook-secret-token>"
export TELEGRAM_WEBHOOK_BASE_URL="<your-new-ngrok-https-url>"
```

3. Inspect current webhook target:

```sh
bun run --cwd server telegram:webhook:info
```

4. Re-register webhook to the new tunnel URL:

```sh
bun run --cwd server telegram:webhook:set
```

5. Verify it was applied:

```sh
bun run --cwd server telegram:webhook:info
```

Optional cleanup (if you want to remove webhook before switching flows):

```sh
bun run --cwd server telegram:webhook:delete
```

Common overrides:

```sh
# set webhook with explicit URL
bun run --cwd server telegram:webhook:set --base-url https://abc123.ngrok-free.app

# set webhook without dropping pending updates
bun run --cwd server telegram:webhook:set --drop-pending false

# inspect script help/options
bun run --cwd server telegram:webhook --help
```

Notes:

- Re-running `setWebhook` replaces the previous URL for that bot.
- Use separate bots for dev and prod to avoid overriding production webhook.
- The webhook URL must be public HTTPS; localhost URLs are not accepted.
- The script also accepts `TELEGRAM_PUBLIC_BASE_URL` or `BASE_URL` when `TELEGRAM_WEBHOOK_BASE_URL` is not set.

Local tunnel testing:

- Keep `BASE_URL` as local app URL (`http://localhost:3000`) if needed.
- Set `TELEGRAM_PUBLIC_BASE_URL` to your tunnel HTTPS URL (ngrok/cloudflared), e.g. `https://abc123.ngrok-free.app`.
- Telegram inline buttons require `https://`; non-HTTPS buttons are ignored by the server.

### Mini App Phase 2 (Planned)

Telegram link token model is reusable for a future Mini App auth endpoint:

- Proposed endpoint: `POST /api/telegram-notifications/miniapp/auth`
- Planned behavior: verify Telegram `initData` hash, then map Telegram user/chat to SubEye user.
