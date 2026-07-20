# Server — Notification System Guidelines

The notification system is a core feature. Bugs here cause silent failures or
notification spam that directly impacts users. Read this before touching any of
the files listed below.

---

## Affected files

| File                                                            | Role                                                          |
|-----------------------------------------------------------------|---------------------------------------------------------------|
| `src/domains/notification/notificationDeliveryService.ts`       | Sends push + Telegram; returns `NotificationDeliveryReport`   |
| `src/domains/push-notification/pushNotificationContent.ts`      | Builds typed `PushNotificationPayload` for renewal and expiry |
| `src/domains/push-notification/pushNotificationService.ts`      | Device tokens + per-user delivery (web-push transport in `@subeye/notifications/push`) |
| `src/domains/subscription/subscriptionNotificationsWorkflow.ts` | QStash workflow — renewal notifications                       |
| `src/domains/subscription/subscriptionCancellationWorkflow.ts`  | QStash workflow — expiry/cancellation notifications           |
| `src/domains/subscription/subscriptionPhaseTransitionWorkflow.ts` | QStash workflow — pricing-phase boundaries (trial/intro/scheduled-change → standard); applies the next phase + notifies |
| `src/routes/user.ts`                                            | Calls `rescheduleUserNotifications` when preferences change   |
| `src/routes/dev.ts`                                             | Dev-only test endpoints that bypass QStash                    |

> **Transport lives in packages.** web-push → `@subeye/notifications/push`, Telegram Bot API → `@subeye/notifications/telegram`, QStash client (`triggerWorkflow`/`cancelWorkflow`/`serve`) → `@subeye/scheduling`. Domain-aware orchestration (when/whom to notify) and the workflow handlers + their replay invariants stay in this app.

---

## QStash workflow invariants — read before touching workflows

Previous notification spam incidents were caused by duplicate workflow runs coexisting during reschedule races. The active protection is implemented in `subscriptionNotificationsWorkflow.ts` + `subscriptionSchedulingService.ts` (the per-user reschedule lock lives there).

QStash **replays the entire handler function from the top** each time a step
wakes up. Every `context.run()` and `context.sleepUntil()` call is tracked by
**sequence index** (0, 1, 2, …). The SDK matches each call to the stored step
by index; if you skip a step on one replay but not another, subsequent step
indices shift and the wrong stored result is returned.

### Rule: never use a live-computed `Date.now()` / `new Date()` as a skip condition inside a workflow loop

```ts
// WRONG — `now` advances on each replay; the interval that just woke up
// satisfies `notifyAt <= now` and the send step is skipped forever.
const now = DateTimezoneUtils.now(tz);
for (const interval of intervals) {
  if (notifyAt.getTime() <= now.getTime()) continue; // ← BUG
  await context.sleepUntil(...);
  await context.run(...);
}
```

```ts
// CORRECT — capture start time once as step 0; QStash returns the same
// stored value on every replay so the condition is stable.
const startedAt = await context.run("init", async () => Date.now());
for (const interval of intervals) {
  if (notifyAt.getTime() <= startedAt) continue; // ← safe; deterministic
  await context.sleepUntil(...);
  await context.run(...);
}
```

### Rule: `continue` inside a workflow loop is safe **only** if the condition is deterministic across replays

All inputs to the skip condition must be either:
- stored QStash step results (like `startedAt` above), or
- values from `context.requestPayload` (immutable).

Anything read from the DB or computed from `new Date()` **may differ** between
replays and must not be used as a loop skip condition.

### Rule: code outside any `context.run()` re-executes on every replay

DB reads at the top of the handler (fetching subscription, preferences, plan)
run on every QStash replay. Keep them cheap and idempotent. Never perform
side-effects (writes, external calls) outside a `context.run()` step.

### Rule: renewal sends must be gated by authoritative run ownership

For renewal workflows, only the run whose id matches the current
`subscriptions.qstash_message_id` may send notifications or schedule next cycle.
Always check:

```ts
latest.qstashMessageId === context.workflowRunId
```

If false, exit without send/schedule. This prevents stale duplicated runs from
spamming push + Telegram.

---

## Reschedule guard — `src/routes/user.ts`

`SubscriptionSchedulingService.rescheduleUserNotifications(userId)` cancels all current
QStash workflows and creates new ones. Calling it on every preference update
causes **duplicate workflows** when the endpoint is called concurrently or
multiple times in quick succession (both calls read the same `qstashMessageId`,
both schedule a new workflow).

**Only reschedule when a notification-relevant field is present in the payload.**
The authoritative list is `NOTIFICATION_RELEVANT_FIELDS` in `src/routes/user.ts`:

```ts
const NOTIFICATION_RELEVANT_FIELDS = [
  "notificationTime",
  "notificationOffset",
  "preferredTimezone",
  "expiryNotificationsEnabled",
  "expiryNotificationIntervals",
] as const;
```

Currency, locale, date-format, and other preference changes must **not**
trigger a reschedule. If you add a new preference field, decide explicitly
whether it affects scheduling and update this list accordingly.

Additionally, `SubscriptionSchedulingService.rescheduleUserNotifications(userId)` must be
serialized per user in-process. Overlapping reschedules for the same user are
not allowed because they can duplicate active QStash runs.

If a workflow cancel operation fails, do not schedule a replacement in the same
pass. Keep the old run as authoritative and retry on the next reschedule.

---

## Pricing-phase transitions — `subscriptionPhaseTransitionWorkflow.ts`

A subscription's price over time is a schedule of ordered phases
(`subscription_price_phases`); the transition workflow fires **one run per phase
boundary** to copy the next phase's price onto the subscription row and notify.
Key invariants (mirroring the renewal workflow):

- **Authoritative-run gating is per phase**, not per subscription:
  `phase.qstashMessageId === context.workflowRunId && phase.appliedAt == null`
  (`isAuthoritativePhaseRun`). A stale duplicate exits without applying.
- **`appliedAt` is the idempotency anchor.** `applyPhaseByWorkflow` /
  `applyBoundaryBatch` are no-ops once `appliedAt` is set, so the reconciler
  (`reconcilePhases`, run on every fetch) and the workflow can both fire safely.
- **One boundary per run, no loops** — the boundary comes from the immutable
  `startsAt` payload, so there is no `Date.now()`-skip hazard. Each run schedules
  the *next* pending boundary inside a `context.run` step.
- **Phase boundaries are deliberately NOT in `rescheduleUserNotifications`.** A
  trial ends on a fixed date regardless of notification preferences, so a
  preference save must not cancel/reschedule them. Do not add phase fields to
  `NOTIFICATION_RELEVANT_FIELDS`.
- `db.batch` is used only in `applyBoundaryBatch` (neon-http has no interactive
  transactions). The legacy `/price-change/workflow` route stays registered to
  drain in-flight runs and bridges to `applyDuePhases`.

---

## Notification delivery — `NotificationDeliveryService`

`NotificationDeliveryService.sendNotification()` sends push + Telegram in
parallel and returns a `NotificationDeliveryReport`. Use this for renewal
notifications.

`NotificationDeliveryService.sendExpiryNotification()` is the expiry variant.
Do not create a new delivery method for a scenario that fits one of these two.

Both methods are fire-and-forget safe — they catch and log errors internally
and never throw. They return a report even on partial failure.

---

## Dev testing — bypass QStash to test immediately

These endpoints send REAL web-push and Telegram messages. They are gated on the
`ENABLE_DEV_ROUTES` binding (`devRoutesEnabled` in `src/routes/dev.ts`) and
return 404 unless it equals the exact string `"true"`. The var is set in
`dev.wrangler.jsonc` and in `apps/server/.env`; it is deliberately ABSENT from
`prod.wrangler.jsonc`. Never add it there.

The previous guard sniffed the request hostname for `localhost`. That value comes
from the client-supplied `Host` header in a Worker and was trivially spoofable.
Do not reintroduce hostname-based gating anywhere in this codebase.

Because `bun test` auto-loads `apps/server/.env`, any test asserting the gate is
closed must clear `process.env.ENABLE_DEV_ROUTES` itself — see
`test/dev-routes-env-gate.test.ts`.

```
POST /api/dev/notifications/test-renewal
Body: { subscriptionId: string; daysUntilPayment: number }

POST /api/dev/notifications/test-expiry
Body: { subscriptionId: string; daysUntilExpiry: number }

POST /api/dev/notifications/test-phase-change
Body: { subscriptionId: string; kind: "trial" | "intro" | "scheduledChange" | "standard" }
```

Both require a valid Clerk Bearer token and ownership of the subscription.
They call `NotificationDeliveryService` directly, bypassing QStash — no DB
side-effects, no scheduled jobs, no cleanup needed.

The corresponding UI is at `/dev/notifications` (redirects to `/` in prod).

Do not use these endpoints as a pattern for production routes. They exist
solely to let developers verify the notification delivery pipeline end-to-end
without waiting for scheduled jobs.

---

## Adding a new notification type

1. Add a payload builder to `PushNotificationContent` (analogous to
   `buildRenewalPayload` / `buildExpiryPayload`).
2. Add a delivery method to `NotificationDeliveryService` if the send logic
   differs materially. Otherwise reuse `sendNotification`.
3. If the notification requires scheduling, add a QStash workflow following
   the patterns in `subscriptionNotificationsWorkflow.ts`. Always capture
   the workflow start time as step 0 (`context.run("init", ...)`).
4. If the notification depends on a user preference, add the relevant fields
   to `NOTIFICATION_RELEVANT_FIELDS` in `src/routes/user.ts`.
5. Add a test endpoint to `src/routes/dev.ts` so it can be verified locally.
