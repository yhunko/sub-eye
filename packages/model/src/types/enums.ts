export enum SubscriptionPeriod {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
}

/**
 * The persisted lifecycle status of a subscription.
 *
 * - `active`     — billing normally
 * - `paused`     — temporarily suspended; occurrences inside the pause window
 *                  contribute nothing to spend
 * - `cancelling` — cancelled but still inside the paid period (this is the value
 *                  the old derived code spelled `cancelledButActive`)
 * - `cancelled`  — the paid period has elapsed
 *
 * The rules that derive it live in the iOS app (`SubEyeCore/Lifecycle.swift`).
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
