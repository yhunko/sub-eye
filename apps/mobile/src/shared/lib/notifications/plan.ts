import type { PricePhaseDto, SubscriptionDto } from "@subeye/shared";
import { SubscriptionPeriod } from "@subeye/shared";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import type { NotificationSettings } from "./settings";

/**
 * The fields scheduling actually reads, not the whole 24-field DTO. A
 * `SubscriptionDto` satisfies this structurally, so callers still pass the list
 * straight through — but `shared/` stays off the entity layer's fixture, which
 * `mobile-fsd-no-shared-upward` would reject, and the test builds inputs by hand.
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

/** One local notification to schedule. Plain data — no expo types in here. */
export type Reminder = {
  kind: ReminderKind;
  fireAt: Date;
  title: string;
  body: string;
  target: ReminderTarget;
};

/**
 * iOS keeps only the **64 soonest** pending local notifications per app and
 * silently drops the rest — no error, no warning. 56 leaves headroom for the
 * test notification and anything else the app ever schedules.
 *
 * Since reminders are grouped into one notification per firing instant, this
 * budget now counts *reminder mornings*, not subscriptions — which is what
 * makes multiple lead times affordable at any subscription count.
 */
export const REMINDER_BUDGET = 56;

/**
 * Renewal occurrences projected per subscription. One would only be correct
 * while the user keeps opening the app; three buys months of runway for someone
 * who ignores it, and grouping means the extra two are usually free.
 */
export const REMINDER_LOOKAHEAD = 3;

/** Services named in a digest before the rest collapse into "and N more". */
const DIGEST_NAME_LIMIT = 3;

type ReminderEvent = {
  kind: ReminderKind;
  subscriptionId: string;
  name: string;
  /** UTC-midnight calendar date the charge or the trial's end lands on. */
  date: Date;
  /**
   * ALWAYS in the user's preferred currency, never the one the subscription was
   * entered in — `billing.preferred` is what the server already converted.
   *
   * The original amount would match the card statement more literally, but a
   * reminder is read against everything else the app shows, all of which is in
   * the preferred currency, and a digest cannot total two currencies at all.
   * `0` means no amount is known and the copy names none.
   */
  amount: number;
  currency: string;
};

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
 * The instant a reminder for `date` fires: `leadDays` earlier, at the configured
 * wall-clock time, in the **device's** zone.
 *
 * The zone divergence is deliberate. A DATE trigger takes an absolute instant
 * but "09:00, three days before" is wall-clock, and the reminder should land at
 * 09:00 where the user physically is — not in the `preferredTimezone` stored on
 * their account, which Settings already shows can disagree. `new Date(y, m, d)`
 * builds in the device zone, and `d - leadDays` rolls back over month and year
 * boundaries on its own.
 */
function fireInstant(
  date: Date,
  leadDays: number,
  hour: number,
  minute: number,
): Date {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - leadDays,
    hour,
    minute,
  );
}

const eventOf = (
  subscription: ReminderInput,
  kind: ReminderKind,
  date: Date,
  billing: SubscriptionDto["billing"],
): ReminderEvent => ({
  kind,
  subscriptionId: subscription.id,
  name: subscription.name,
  date,
  amount: billing.preferred.amount,
  currency: billing.preferred.currencyCode,
});

function renewalEvents(subscription: ReminderInput): ReminderEvent[] {
  // `subscriptionStatuses`, NOT the lifecycle vocabulary — comparing across the
  // two silently never matches. Only `active` renews: `cancelling` is already
  // inside its final paid period and will not be charged again.
  if (subscription.status !== "active") return [];

  const anchor = new Date(subscription.nextPaymentDate);
  if (Number.isNaN(anchor.getTime())) return [];

  const events: ReminderEvent[] = [];
  for (let step = 0; step < REMINDER_LOOKAHEAD; step++) {
    events.push(
      eventOf(
        subscription,
        "renewal",
        occurrenceAfter(anchor, subscription.every, subscription.period, step),
        subscription.billing,
      ),
    );
  }
  return events;
}

/**
 * The one-shot "you are about to start paying" event.
 *
 * Priced from `upcomingPhase.billing`, NOT the subscription's: during a trial
 * the subscription's own billing reflects what the trial charges, which is
 * usually zero, and "0.00 starts then" is the opposite of the warning. A phase
 * carries its own converted amount, so this needs no rate arithmetic. A trial
 * with no known follow-on price still earns a reminder — it just names no sum.
 */
function trialEndEvent(subscription: ReminderInput): ReminderEvent | null {
  if (subscription.status !== "active") return null;

  const trial = subscription.pricePhases?.find(
    (phase) => phase.isActive && phase.kind === "trial",
  );
  if (!trial?.endsAt) return null;

  const date = new Date(trial.endsAt);
  if (Number.isNaN(date.getTime())) return null;

  const next = subscription.upcomingPhase?.billing;
  return eventOf(subscription, "trialEnd", date, {
    ...subscription.billing,
    preferred: next
      ? next.preferred
      : { ...subscription.billing.preferred, amount: 0 },
  });
}

/** "today" / "tomorrow" / "in N days" — lowercase, for use inside a sentence. */
function whenPhrase(leadDays: number): string {
  if (leadDays <= 0) return m.notif_whenToday();
  if (leadDays === 1) return m.notif_whenTomorrow();
  return m.notif_whenInDays({ days: leadDays });
}

/** "Netflix, Spotify and 2 more" — never a bare count, which needs plurals. */
function nameList(events: readonly ReminderEvent[]): string {
  const names = events.map((event) => event.name);
  if (names.length <= DIGEST_NAME_LIMIT) return names.join(", ");

  return m.notif_digestMore({
    names: names.slice(0, DIGEST_NAME_LIMIT).join(", "),
    count: names.length - DIGEST_NAME_LIMIT,
  });
}

const utcDateKey = (date: Date): string => date.toISOString().slice(0, 10);

/** Whole days from `fireAt`'s calendar day to the event's, for the copy. */
function leadDaysOf(event: ReminderEvent, fireAt: Date): number {
  const eventDay = Date.UTC(
    event.date.getUTCFullYear(),
    event.date.getUTCMonth(),
    event.date.getUTCDate(),
  );
  const fireDay = Date.UTC(
    fireAt.getFullYear(),
    fireAt.getMonth(),
    fireAt.getDate(),
  );
  return Math.round((eventDay - fireDay) / 86_400_000);
}

function describe(
  kind: ReminderKind,
  fireAt: Date,
  events: readonly ReminderEvent[],
): Reminder {
  const first = events[0];
  if (!first) throw new Error("empty reminder group");

  const when = whenPhrase(leadDaysOf(first, fireAt));

  if (events.length === 1) {
    if (kind === "renewal") {
      return {
        kind,
        fireAt,
        title: m.notif_renewalTitle({ name: first.name, when }),
        body: m.notif_renewalBody({
          amount: formatMoney(first.amount, first.currency),
        }),
        target: { screen: "subscription", id: first.subscriptionId },
      };
    }

    // A trial with no known follow-on price still earns the warning; it just
    // cannot name a figure, and inventing "0.00" would invert the message.
    return {
      kind,
      fireAt,
      title: m.notif_trialTitle({ name: first.name, when }),
      body:
        first.amount > 0
          ? m.notif_trialBody({
              amount: formatMoney(first.amount, first.currency),
            })
          : m.notif_trialBodyNoAmount(),
      target: { screen: "subscription", id: first.subscriptionId },
    };
  }

  const days = new Set(events.map((event) => utcDateKey(event.date)));
  const sameDay = days.size === 1;

  // Every event now carries a preferred-currency amount, so a trial digest can
  // total too — "what is about to start being charged". Summed only when EVERY
  // event has a figure: one unknown price would silently understate the rest,
  // and a total that is quietly too low is worse than no total.
  const total = events.every((event) => event.amount > 0)
    ? formatMoney(
        Number(events.reduce((sum, event) => sum + event.amount, 0).toFixed(2)),
        first.currency,
      )
    : null;

  const names = nameList(events);

  return {
    kind,
    fireAt,
    title:
      kind === "renewal"
        ? sameDay
          ? m.notif_renewalDigestTitle({ when })
          : m.notif_renewalDigestTitleMixed()
        : sameDay
          ? m.notif_trialDigestTitle({ when })
          : m.notif_trialDigestTitleMixed(),
    body: total ? m.notif_digestBody({ names, amount: total }) : names,
    // The due screen filters on `nextPaymentDate`, so only a renewal group can
    // point at it — a trial-end group shares a date with nothing that screen
    // knows how to look up and would open an empty list. A mixed-day group has
    // no single date to filter on either.
    target:
      kind === "renewal" && sameDay
        ? { screen: "due", date: utcDateKey(first.date) }
        : { screen: "list" },
  };
}

/**
 * Every reminder worth scheduling right now, soonest first.
 *
 * Events are grouped by **firing instant**, not by subscription: two renewals
 * that would both fire at 09:00 tomorrow become one banner naming both. That is
 * what keeps the schedule inside the iOS ceiling once several lead times are in
 * play — the budget counts mornings, not subscriptions — and it is also the
 * better lock screen. Grouping by `(instant, leadDays)` instead would put two
 * banners on the same minute whenever lead times overlap, which is the exact
 * thing this exists to prevent.
 *
 * Pure: takes `now`, never reads a clock, never touches `expo-notifications` or
 * storage. The effectful wrapper in `./index` is a thin shell over this.
 */
export function planReminders(
  subscriptions: readonly ReminderInput[],
  settings: NotificationSettings,
  now: Date,
  budget: number = REMINDER_BUDGET,
): Reminder[] {
  const events: ReminderEvent[] = [];

  for (const subscription of subscriptions) {
    if (settings.renewals) events.push(...renewalEvents(subscription));
    if (settings.trials) {
      const trial = trialEndEvent(subscription);
      if (trial) events.push(trial);
    }
  }

  const groups = new Map<
    string,
    { kind: ReminderKind; fireAt: Date; events: ReminderEvent[] }
  >();

  for (const event of events) {
    const leadDays =
      event.kind === "renewal"
        ? settings.renewalLeadDays
        : settings.trialLeadDays;

    for (const lead of leadDays) {
      const fireAt = fireInstant(
        event.date,
        lead,
        settings.hour,
        settings.minute,
      );
      // A trigger in the past fires immediately on iOS. Skip rather than nag.
      if (fireAt.getTime() <= now.getTime()) continue;

      const key = `${event.kind}:${fireAt.getTime()}`;
      const group = groups.get(key);
      if (!group) {
        groups.set(key, { kind: event.kind, fireAt, events: [event] });
        continue;
      }

      // A daily plan with lead times {0,1} projects two occurrences onto the
      // same morning. They are two real charges, but naming the service twice
      // in one banner reads as a bug — keep the soonest.
      if (
        group.events.some(
          (held) => held.subscriptionId === event.subscriptionId,
        )
      ) {
        continue;
      }
      group.events.push(event);
    }
  }

  // Sort THEN trim: the budget must keep the soonest reminders, because those
  // are the ones iOS would have kept anyway and the ones the user needs first.
  return [...groups.values()]
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, budget)
    .map((group) => describe(group.kind, group.fireAt, group.events));
}
