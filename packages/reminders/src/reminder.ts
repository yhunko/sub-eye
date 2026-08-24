import type { PricePhaseDto, SubscriptionDto } from "@subeye/model";

/**
 * The fields scheduling actually reads, not the whole 24-field DTO. A
 * `SubscriptionDto` satisfies this structurally, so callers still pass the list
 * straight through — and the test builds inputs by hand.
 *
 * The two phase fields are optional so a test fixture can omit them; a
 * subscription with no trial reads identically to one that never had phases.
 */
export type ReminderInput = Pick<
  SubscriptionDto,
  "id" | "name" | "every" | "period" | "nextPaymentDate" | "status" | "billing"
> & {
  pricePhases?: readonly Pick<PricePhaseDto, "kind" | "endsAt" | "isActive">[];
  upcomingPhase?: Pick<PricePhaseDto, "billing"> | null;
};

export type ReminderKind = "renewal" | "trialEnd";

/** Where a tap on the notification should land. Read by the app-layer router. */
export type ReminderTarget =
  | { screen: "subscription"; id: string }
  | { screen: "due"; date: string }
  | { screen: "list" };

/**
 * Every string the planner needs, injected by the caller.
 *
 * A pure package cannot import paraglide's `m`: it is generated into the mobile
 * app and reaches `expo-localization`. The app builds one of these from `m` and
 * `formatMoney`; the test builds one from echoing stubs.
 */
export type ReminderCopy = {
  whenToday(): string;
  whenTomorrow(): string;
  whenInDays(args: { days: number }): string;
  renewalTitle(args: { name: string; when: string }): string;
  renewalBody(args: { amount: string }): string;
  renewalBodyNoAmount(): string;
  trialTitle(args: { name: string; when: string }): string;
  trialBody(args: { amount: string }): string;
  trialBodyNoAmount(): string;
  renewalDigestTitle(args: { when: string }): string;
  renewalDigestTitleMixed(): string;
  trialDigestTitle(args: { when: string }): string;
  trialDigestTitleMixed(): string;
  digestBody(args: { names: string; amount: string }): string;
  digestMore(args: { names: string; count: number }): string;
  money(amount: number, currency: string): string;
};

/** One local notification to schedule. Plain data — no expo types in here. */
export type Reminder = {
  kind: ReminderKind;
  fireAt: Date;
  title: string;
  body: string;
  target: ReminderTarget;
};
