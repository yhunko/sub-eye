import type { SubscriptionDto } from "@subeye/model";
import { DateTimezoneUtils, RecurrenceUtils } from "@subeye/time";
import type {
  Reminder,
  ReminderCopy,
  ReminderInput,
  ReminderKind,
} from "./reminder";
import type { ReminderSettings } from "./settings";

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

  const anchor = DateTimezoneUtils.toCalendarDay(subscription.nextPaymentDate);
  if (Number.isNaN(anchor.getTime())) return [];

  const events: ReminderEvent[] = [];
  for (let step = 0; step < REMINDER_LOOKAHEAD; step++) {
    events.push(
      eventOf(
        subscription,
        "renewal",
        // `every * step` measured from the anchor on every iteration, never by
        // stepping from the last occurrence: a clamped month (Jan 31 → Feb 28)
        // would otherwise drag every later occurrence back with it. `addPeriod`
        // anchors on the date it is handed, which is the anchor.
        RecurrenceUtils.addPeriod(
          anchor,
          subscription.every * step,
          subscription.period,
        ),
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
function whenPhrase(leadDays: number, copy: ReminderCopy): string {
  if (leadDays <= 0) return copy.whenToday();
  if (leadDays === 1) return copy.whenTomorrow();
  return copy.whenInDays({ days: leadDays });
}

/** "Netflix, Spotify and 2 more" — never a bare count, which needs plurals. */
function nameList(
  events: readonly ReminderEvent[],
  copy: ReminderCopy,
): string {
  const names = events.map((event) => event.name);
  if (names.length <= DIGEST_NAME_LIMIT) return names.join(", ");

  return copy.digestMore({
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
  copy: ReminderCopy,
): Reminder {
  const first = events[0];
  if (!first) throw new Error("empty reminder group");

  const when = whenPhrase(leadDaysOf(first, fireAt), copy);

  if (events.length === 1) {
    if (kind === "renewal") {
      return {
        kind,
        fireAt,
        title: copy.renewalTitle({ name: first.name, when }),
        // An amount that could not be converted is 0, and naming it would
        // promise a charge of nothing. Same fork as the trial branch below.
        body:
          first.amount > 0
            ? copy.renewalBody({
                amount: copy.money(first.amount, first.currency),
              })
            : copy.renewalBodyNoAmount(),
        target: { screen: "subscription", id: first.subscriptionId },
      };
    }

    // A trial with no known follow-on price still earns the warning; it just
    // cannot name a figure, and inventing "0.00" would invert the message.
    return {
      kind,
      fireAt,
      title: copy.trialTitle({ name: first.name, when }),
      body:
        first.amount > 0
          ? copy.trialBody({
              amount: copy.money(first.amount, first.currency),
            })
          : copy.trialBodyNoAmount(),
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
    ? copy.money(
        Number(events.reduce((sum, event) => sum + event.amount, 0).toFixed(2)),
        first.currency,
      )
    : null;

  const names = nameList(events, copy);

  return {
    kind,
    fireAt,
    title:
      kind === "renewal"
        ? sameDay
          ? copy.renewalDigestTitle({ when })
          : copy.renewalDigestTitleMixed()
        : sameDay
          ? copy.trialDigestTitle({ when })
          : copy.trialDigestTitleMixed(),
    body: total ? copy.digestBody({ names, amount: total }) : names,
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
 * Pure: takes `now` and its copy, never reads a clock, never touches
 * `expo-notifications` or storage. The effectful wrapper in the app is a thin
 * shell over this.
 */
export function planReminders(
  subscriptions: readonly ReminderInput[],
  settings: ReminderSettings,
  now: Date,
  copy: ReminderCopy,
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
    .map((group) => describe(group.kind, group.fireAt, group.events, copy));
}
