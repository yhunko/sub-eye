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

Local tunnel testing:

- Keep `BASE_URL` as local app URL (`http://localhost:3000`) if needed.
- Set `TELEGRAM_PUBLIC_BASE_URL` to your tunnel HTTPS URL (ngrok/cloudflared), e.g. `https://abc123.ngrok-free.app`.
- Telegram inline buttons require `https://`; non-HTTPS buttons are ignored by the server.

### Mini App Phase 2 (Planned)

Telegram link token model is reusable for a future Mini App auth endpoint:

- Proposed endpoint: `POST /api/telegram-notifications/miniapp/auth`
- Planned behavior: verify Telegram `initData` hash, then map Telegram user/chat to SubEye user.
