import { type SubscriptionDto, SubscriptionPeriod } from "@subeye/shared";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";

/**
 * The eight fields scheduling actually reads, not the whole 24-field DTO. A
 * `SubscriptionDto` satisfies this structurally, so callers still pass the list
 * straight through — but `shared/` stays off the entity layer's fixture, which
 * `mobile-fsd-no-shared-upward` would reject, and the test builds inputs by hand.
 */
export type RenewalInput = Pick<
  SubscriptionDto,
  | "id"
  | "name"
  | "cost"
  | "currency"
  | "every"
  | "period"
  | "nextPaymentDate"
  | "status"
>;

/** One local notification to schedule. Plain data — no expo types in here. */
export type RenewalReminder = {
  subscriptionId: string;
  fireAt: Date;
  title: string;
  body: string;
};

/**
 * iOS keeps only the **64 soonest** pending local notifications per app and
 * silently drops the rest — no error, no warning. Everything below exists to
 * stay under that ceiling: a bounded window, sorted, trimmed. 56 leaves
 * headroom for anything else the app ever schedules.
 */
export const REMINDER_BUDGET = 56;

/**
 * Occurrences scheduled per subscription. One would only be correct while the
 * user keeps opening the app; three buys months of runway for someone who
 * ignores it, inside the same budget (56 / 3 ≈ 18 subscriptions before trimming
 * starts, and trimming keeps the soonest, so the near-term reminders survive).
 */
export const REMINDER_LOOKAHEAD = 3;

/** Wall-clock hour, in the device's zone. Late enough not to wake anyone. */
export const REMINDER_HOUR = 9;

/**
 * `nextPaymentDate` and friends are UTC-midnight calendar dates, and the rest of
 * the app reads them that way (`formatDate` pins `timeZone: "UTC"`). So the
 * projection walks UTC components — `date-fns` would apply the device's zone and
 * let a DST shift move a renewal across midnight.
 *
 * ponytail: `Date.UTC` rather than `@subeye/spend`. This is `nextPaymentDate`
 * plus an interval, not a spend derivation; the package is not a mobile
 * dependency and would cost bundle weight for arithmetic the platform does. If
 * a real edge case ever needs proration or pause windows, swap it in — and note
 * that pure packages take `now` as a parameter and never touch a clock.
 */
function addUtcMonths(date: Date, months: number): Date {
  // Clamp to the target month's last day: the 31st of a 30-day month would
  // otherwise overflow into the next one (Jan 31 + 1 month → Mar 3).
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target;
}

/**
 * The `step`-th occurrence after `anchor`, always measured from the anchor
 * rather than by repeated stepping — stepping would let a clamped month
 * (Jan 31 → Feb 28) drag every later occurrence back with it.
 */
function occurrenceAfter(
  anchor: Date,
  every: number,
  period: SubscriptionPeriod,
  step: number,
): Date {
  const count = every * step;
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const day = anchor.getUTCDate();

  switch (period) {
    case SubscriptionPeriod.DAY:
      return new Date(Date.UTC(year, month, day + count));
    case SubscriptionPeriod.WEEK:
      return new Date(Date.UTC(year, month, day + count * 7));
    case SubscriptionPeriod.MONTH:
      return addUtcMonths(anchor, count);
    case SubscriptionPeriod.YEAR:
      return addUtcMonths(anchor, count * 12);
  }
}

/**
 * The instant to fire for a renewal on `occurrence`: the day before at
 * REMINDER_HOUR, in the **device's** zone.
 *
 * The zone divergence is deliberate. A DATE trigger takes an absolute instant
 * but "the day before at 09:00" is wall-clock, and the reminder should land at
 * 09:00 where the user physically is — not in the `preferredTimezone` stored on
 * their account, which Settings already shows can disagree. `new Date(y, m, d)`
 * builds in the device zone, and d − 1 rolls back over month/year boundaries.
 */
function reminderInstant(occurrence: Date): Date {
  return new Date(
    occurrence.getUTCFullYear(),
    occurrence.getUTCMonth(),
    occurrence.getUTCDate() - 1,
    REMINDER_HOUR,
  );
}

/**
 * Every renewal reminder worth scheduling right now, soonest first.
 *
 * Pure: takes `now`, never reads a clock, never touches `expo-notifications` or
 * storage. The effectful wrapper in `./index` is a thin shell over this.
 */
export function planRenewalReminders(
  subscriptions: RenewalInput[],
  now: Date,
  budget: number = REMINDER_BUDGET,
): RenewalReminder[] {
  const reminders: RenewalReminder[] = [];

  for (const subscription of subscriptions) {
    // `subscriptionStatuses`, NOT the lifecycle vocabulary — comparing across
    // the two silently never matches. Only `active` renews: `cancelling` is
    // already inside its final paid period and will not be charged again.
    if (subscription.status !== "active") continue;

    const anchor = new Date(subscription.nextPaymentDate);
    if (Number.isNaN(anchor.getTime())) continue;

    for (let step = 0; step < REMINDER_LOOKAHEAD; step++) {
      const occurrence = occurrenceAfter(
        anchor,
        subscription.every,
        subscription.period,
        step,
      );
      const fireAt = reminderInstant(occurrence);
      // A trigger in the past fires immediately on iOS. Skip rather than nag.
      if (fireAt.getTime() <= now.getTime()) continue;

      reminders.push({
        subscriptionId: subscription.id,
        fireAt,
        title: m.notif_renewalTitle({ name: subscription.name }),
        body: m.notif_renewalBody({
          amount: formatMoney(subscription.cost, subscription.currency),
        }),
      });
    }
  }

  // Sort THEN trim: the budget must keep the soonest reminders, because those
  // are the ones iOS would have kept anyway and the ones the user needs first.
  reminders.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  return reminders.slice(0, budget);
}
