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
  | "id"
  | "name"
  | "every"
  | "period"
  | "nextPaymentDate"
  | "status"
  | "billing"
  | "willBeCancelledAt"
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

/**
 * A recurrence the OS can re-fire on its own, forever.
 *
 * The numbers are expo's, and each unit uses a different convention. Getting one
 * wrong produces a reminder on the wrong day rather than an error, so they are
 * pinned by concrete assertions in `test/repeatRule.test.ts`.
 */
export type RepeatRule =
  | { unit: "daily"; hour: number; minute: number }
  /** `weekday` is 1–7, Sunday = 1 — expo's convention, NOT `Date.getDay()`'s 0–6. */
  | { unit: "weekly"; weekday: number; hour: number; minute: number }
  /** `day` is 1-based, like `Date.getDate()`. */
  | { unit: "monthly"; day: number; hour: number; minute: number }
  /** `month` is 0-BASED, like `Date.getMonth()`. January is 0. */
  | {
      unit: "yearly";
      month: number;
      day: number;
      hour: number;
      minute: number;
    };

export type ReminderSchedule =
  | { repeats: false; fireAt: Date }
  /**
   * `firstAt` is the next instant the rule matches — for ordering and for the
   * health screen only. The OS owns every firing after it, including that one.
   */
  | { repeats: true; rule: RepeatRule; firstAt: Date };

/** One local notification to schedule. Plain data — no expo types in here. */
export type Reminder = {
  kind: ReminderKind;
  schedule: ReminderSchedule;
  title: string;
  body: string;
  target: ReminderTarget;
};
