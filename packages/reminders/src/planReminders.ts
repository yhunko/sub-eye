import { type SubscriptionDto, SubscriptionPeriod } from "@subeye/model";
import { DateTimezoneUtils, RecurrenceUtils } from "@subeye/time";
import type {
  Reminder,
  ReminderCopy,
  ReminderInput,
  ReminderKind,
  ReminderSchedule,
  RepeatRule,
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

/**
 * The recurrence the OS can re-fire forever for this subscription and lead time,
 * or `null` to fall back to the one-shot `DATE` triggers.
 *
 * `null` is not a shortfall to be optimised away. A repeating trigger keeps
 * firing whatever the subscription becomes, and the app is not open to notice a
 * date-driven transition — so anything carrying a pending one is refused
 * deliberately. Loosening this brings back reminders for subscriptions the user
 * already cancelled, which costs more trust than the missing coverage is worth.
 *
 * Cancelling, pausing and editing all happen IN the app, which rebuilds the
 * whole schedule on the spot; only the dates move on their own.
 */
export function repeatRuleFor(
  subscription: ReminderInput,
  leadDays: number,
  hour: number,
  minute: number,
): RepeatRule | null {
  // `active` already excludes a pending cancellation: a future cancellation
  // derives as `cancelling`, never as `active`.
  if (subscription.status !== "active") return null;
  // A price change on a known date makes the amount baked into the body wrong.
  if (subscription.upcomingPhase) return null;
  if (
    subscription.pricePhases?.some(
      (phase) => phase.isActive && phase.kind === "trial",
    )
  ) {
    return null;
  }
  // `every: 3` is quarterly, and no calendar unit means "every third month".
  if (subscription.every !== 1) return null;

  const anchor = DateTimezoneUtils.toCalendarDay(subscription.nextPaymentDate);
  if (Number.isNaN(anchor.getTime())) return null;

  // The calendar date the reminder lands on. `Date.UTC` rolls a negative day
  // back over month and year boundaries, exactly as `fireInstant` does.
  const fireDay = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate() - leadDays,
    ),
  );

  switch (subscription.period) {
    case SubscriptionPeriod.DAY:
      return { unit: "daily", hour, minute };
    case SubscriptionPeriod.WEEK:
      return { unit: "weekly", weekday: fireDay.getUTCDay() + 1, hour, minute };
    case SubscriptionPeriod.MONTH: {
      const day = anchor.getUTCDate() - leadDays;
      // Above 28 the rule silently does not fire in February — a missed renewal
      // once a year. Below 1 the lead crosses into the previous month, where
      // "three days before the 2nd" is a different day every time.
      if (day < 1 || day > 28) return null;
      return { unit: "monthly", day, hour, minute };
    }
    case SubscriptionPeriod.YEAR: {
      const month = fireDay.getUTCMonth();
      const day = fireDay.getUTCDate();
      // 29 February exists one year in four; the other three go quiet.
      if (month === 1 && day === 29) return null;
      return { unit: "yearly", month, day, hour, minute };
    }
  }
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

const scheduledAt = (schedule: ReminderSchedule): Date =>
  schedule.repeats ? schedule.firstAt : schedule.fireAt;

function describe(
  kind: ReminderKind,
  schedule: ReminderSchedule,
  events: readonly ReminderEvent[],
  copy: ReminderCopy,
): Reminder {
  const first = events[0];
  if (!first) throw new Error("empty reminder group");

  // A repeat rule fires the same number of days ahead of the charge every time,
  // so the phrase computed from its first firing stays true for all of them.
  const when = whenPhrase(leadDaysOf(first, scheduledAt(schedule)), copy);

  if (events.length === 1) {
    if (kind === "renewal") {
      return {
        kind,
        schedule,
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
      schedule,
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
    schedule,
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

type ReminderGroup = {
  kind: ReminderKind;
  schedule: ReminderSchedule;
  events: ReminderEvent[];
};

function addTo(
  groups: Map<string, ReminderGroup>,
  key: string,
  schedule: ReminderSchedule,
  event: ReminderEvent,
): void {
  const group = groups.get(key);
  if (!group) {
    groups.set(key, { kind: event.kind, schedule, events: [event] });
    return;
  }

  // A daily plan with lead times {0,1} projects two occurrences onto the same
  // morning. They are two real charges, but naming the service twice in one
  // banner reads as a bug — keep the soonest.
  if (
    group.events.some((held) => held.subscriptionId === event.subscriptionId)
  ) {
    return;
  }
  group.events.push(event);
}

/**
 * Every reminder worth scheduling right now — repeating ones first, then the
 * one-shots soonest first.
 *
 * Two modes. A `(subscription, lead)` pair whose recurrence the OS can express
 * — see `repeatRuleFor` — becomes ONE repeating trigger that fires forever, and
 * contributes no one-shot occurrences at all; scheduling both would double-notify
 * on the same morning. Everything else keeps the one-shot projection unchanged.
 *
 * Events are grouped so that one banner covers a whole morning: one-shots by
 * **firing instant**, repeating ones by **serialised rule**, so two monthly
 * subscriptions that both fire on day 14 share a single permanent trigger. That
 * is what keeps the schedule inside the iOS ceiling once several lead times are
 * in play — the budget counts mornings, not subscriptions — and it is also the
 * better lock screen. Grouping by `(instant, leadDays)` instead would put two
 * banners on the same minute whenever lead times overlap, which is the exact
 * thing this exists to prevent.
 *
 * Repeating groups take the budget first. A repeating trigger is permanent
 * coverage and must not be crowded out by a burst of near-term one-shots; they
 * are bounded by subscription count × lead count, so they cannot run away.
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
  const oneShot = new Map<string, ReminderGroup>();
  const repeating = new Map<string, ReminderGroup>();

  for (const subscription of subscriptions) {
    const collect = (
      events: readonly ReminderEvent[],
      leads: readonly number[],
      // A trial ends once, so a trial stream never earns a rule however plain
      // the subscription is.
      recurs: boolean,
    ) => {
      for (const lead of leads) {
        const rule = recurs
          ? repeatRuleFor(subscription, lead, settings.hour, settings.minute)
          : null;

        for (const event of events) {
          const fireAt = fireInstant(
            event.date,
            lead,
            settings.hour,
            settings.minute,
          );
          // A trigger in the past fires immediately on iOS. Skip rather than nag.
          if (fireAt.getTime() <= now.getTime()) continue;

          if (rule) {
            // The first occurrence still ahead is the next instant the rule
            // matches, because eligibility is exactly what guarantees the rule
            // and the projection describe the same recurrence. The OS owns
            // every firing after it, so this pair is done — the `break` is what
            // stops it also emitting the one-shots it would double-notify with.
            addTo(
              repeating,
              `${event.kind}:${JSON.stringify(rule)}`,
              { repeats: true, rule, firstAt: fireAt },
              event,
            );
            break;
          }

          addTo(
            oneShot,
            `${event.kind}:${fireAt.getTime()}`,
            { repeats: false, fireAt },
            event,
          );
        }
      }
    };

    if (settings.renewals) {
      collect(renewalEvents(subscription), settings.renewalLeadDays, true);
    }
    if (settings.trials) {
      const trial = trialEndEvent(subscription);
      if (trial) collect([trial], settings.trialLeadDays, false);
    }
  }

  const soonestFirst = (a: ReminderGroup, b: ReminderGroup) =>
    scheduledAt(a.schedule).getTime() - scheduledAt(b.schedule).getTime();

  // Sort THEN trim: within each mode the budget must keep the soonest, because
  // those are the ones iOS would have kept anyway and the ones the user needs
  // first.
  return [
    ...[...repeating.values()].sort(soonestFirst),
    ...[...oneShot.values()].sort(soonestFirst),
  ]
    .slice(0, budget)
    .map((group) => describe(group.kind, group.schedule, group.events, copy));
}
