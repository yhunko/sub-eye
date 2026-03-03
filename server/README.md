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

- In non-production sandbox environments, `PADDLE_PLUS_PRODUCT_ID` falls back to
  `pro_01keh6xkw0jw7e744f5he2t69s` if not set.
- In production, `PADDLE_PLUS_PRODUCT_ID` must be set explicitly.
