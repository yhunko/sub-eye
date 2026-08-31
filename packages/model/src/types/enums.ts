export enum SubscriptionPeriod {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
}

/**
 * The persisted lifecycle status of a subscription.
 *
 * Before v4 this was derived on every read from the single nullable column
 * `subscriptions.cancelled_at` (see `getSubscriptionLifecycleStatus` in
 * `@subeye/lifecycle`), which meant it could not be filtered in SQL and could
 * not express "paused until 15 March". The order below is the order of the
 * `subscription_status` pgEnum — do not reorder it without a migration.
 *
 * - `active`     — billing normally
 * - `paused`     — temporarily suspended; occurrences inside the pause window
 *                  contribute nothing to spend
 * - `cancelling` — cancelled but still inside the paid period (this is the value
 *                  the old derived code spelled `cancelledButActive`)
 * - `cancelled`  — the paid period has elapsed
 *
 * The vocabulary lives here and the rules that read it live in
 * `@subeye/lifecycle`: the DTO schemas below validate against it, and a package
 * every consumer already imports cannot depend on one that imports it back.
 */
export const subscriptionStatuses = [
  "active",
  "paused",
  "cancelling",
  "cancelled",
] as const;

export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const subscriptionAllowedActions = [
  "edit",
  "pause",
  "resume",
  "cancel",
  "renew",
  "delete",
  "addPhase",
  "applyPhaseNow",
  "cancelPhase",
] as const;

export type SubscriptionAllowedAction =
  (typeof subscriptionAllowedActions)[number];
