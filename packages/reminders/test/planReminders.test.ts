import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import {
  planReminders,
  REMINDER_LOOKAHEAD,
  type ReminderCopy,
  type ReminderInput,
  type ReminderSettings,
} from "../src";

// Each stub echoes its inputs so an assertion can tell the shapes apart.
// `money` mirrors `formatMoney`: the symbol for a known code, the code itself
// for anything else.
const testCopy: ReminderCopy = {
  whenToday: () => "today",
  whenTomorrow: () => "tomorrow",
  whenInDays: ({ days }) => `in ${days} days`,
  renewalTitle: ({ name, when }) => `${name} renews ${when}`,
  renewalBody: ({ amount }) => amount,
  renewalBodyNoAmount: () => "renewal no amount",
  renewalDigestTitle: ({ when }) => `Renewing ${when}`,
  renewalDigestTitleMixed: () => "Upcoming renewals",
  trialTitle: ({ name, when }) => `${name} trial ends ${when}`,
  trialBody: ({ amount }) => `trial ${amount}`,
  trialBodyNoAmount: () => "trial no amount",
  trialDigestTitle: ({ when }) => `Trials ending ${when}`,
  trialDigestTitleMixed: () => "Trials ending soon",
  digestBody: ({ names, amount }) => `${names} · ${amount}`,
  digestMore: ({ names, count }) => `${names} and ${count} more`,
  money: (amount, currency) =>
    currency === "uah"
      ? `₴${amount.toFixed(2)}`
      : `${amount.toFixed(2)} ${currency.toUpperCase()}`,
};

// Local time, so `now` is comparable to the device-zone instants the planner
// returns regardless of which zone the test runs in.
const NOW = new Date(2026, 6, 1, 12);

const settings = (
  overrides: Partial<ReminderSettings> = {},
): ReminderSettings => ({
  renewals: true,
  renewalLeadDays: [1],
  trials: false,
  trialLeadDays: [1],
  hour: 9,
  minute: 0,
  ...overrides,
});

/** Billing as the server sends it: `preferred` is already converted. */
const billing = (
  amount: number,
  preferredCurrency = "uah",
  originalCurrency = preferredCurrency,
) => ({
  original: { currencyCode: originalCurrency, monthly: amount },
  preferred: {
    currencyCode: preferredCurrency,
    amount,
    monthly: amount,
    yearly: amount * 12,
    exchangeRate: 1,
  },
});

const sub = (overrides: Partial<ReminderInput> = {}): ReminderInput => ({
  id: "sub_1",
  name: "Netflix",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  nextPaymentDate: "2026-08-01T00:00:00.000Z",
  status: "active",
  billing: billing(100),
  ...overrides,
});

/** [year, month, day, hour, minute] in the DEVICE zone — where reminders fire. */
const localParts = (date: Date) => [
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
  date.getHours(),
  date.getMinutes(),
];

describe("planReminders", () => {
  it("fires the day before the renewal, at the configured wall-clock time", () => {
    const reminders = planReminders(
      [sub()],
      settings({ hour: 7, minute: 30 }),
      NOW,
      testCopy,
    );

    // 1 August renews -> 31 July 07:30, rolling back over the month boundary.
    expect(localParts(reminders[0]?.fireAt ?? new Date())).toEqual([
      2026, 6, 31, 7, 30,
    ]);
    expect(reminders[0]?.title).toBe("Netflix renews tomorrow");
    expect(reminders[0]?.body).toBe("₴100.00");
    expect(reminders[0]?.target).toEqual({
      screen: "subscription",
      id: "sub_1",
    });
  });

  // The amount is ALWAYS the preferred currency, never the one the
  // subscription was entered in. A $9.99 sub on a ₴ account says ₴410.
  it("names the amount in the preferred currency, not the original", () => {
    const reminders = planReminders(
      [sub({ billing: billing(410, "uah", "usd") })],
      settings(),
      NOW,
      testCopy,
    );

    expect(reminders[0]?.body).toBe("₴410.00");
  });

  // `renewalBody` formats an amount unconditionally, so an amount that could
  // not be converted would read "₴0.00 will be charged".
  it("names no figure when the renewal amount is unknown", () => {
    const reminders = planReminders(
      [sub({ billing: billing(0) })],
      settings(),
      NOW,
      testCopy,
    );

    expect(reminders[0]?.body).toBe("renewal no amount");
  });

  it("totals a digest in the preferred currency across mixed originals", () => {
    const reminders = planReminders(
      [
        sub({ billing: billing(410, "uah", "usd") }),
        sub({
          id: "sub_2",
          name: "Spotify",
          billing: billing(90, "uah", "eur"),
        }),
      ],
      settings(),
      NOW,
      testCopy,
    );

    expect(reminders[0]?.body).toBe("Netflix, Spotify · ₴500.00");
  });

  it("schedules several occurrences ahead, clamping short months", () => {
    const reminders = planReminders(
      [sub({ nextPaymentDate: "2026-12-31T00:00:00.000Z" })],
      settings(),
      NOW,
      testCopy,
    );

    expect(reminders).toHaveLength(REMINDER_LOOKAHEAD);
    // 31 Dec, then 31 Jan, then 28 Feb (clamped) — each reminder a day earlier.
    expect(reminders.map((r) => localParts(r.fireAt))).toEqual([
      [2026, 11, 30, 9, 0],
      [2027, 0, 30, 9, 0],
      [2027, 1, 27, 9, 0],
    ]);
  });

  it("skips a subscription that is not billing", () => {
    expect(
      planReminders([sub({ status: "cancelling" })], settings(), NOW, testCopy),
    ).toEqual([]);
  });

  // The core of the digest: without grouping these are two banners on the same
  // minute, and the pair costs two of the 56 iOS slots instead of one.
  it("merges same-instant renewals into one notification", () => {
    const reminders = planReminders(
      [sub(), sub({ id: "sub_2", name: "Spotify", billing: billing(50) })],
      settings(),
      NOW,
      testCopy,
    );

    expect(reminders).toHaveLength(REMINDER_LOOKAHEAD);
    expect(reminders[0]?.title).toBe("Renewing tomorrow");
    expect(reminders[0]?.body).toBe("Netflix, Spotify · ₴150.00");
    expect(reminders[0]?.target).toEqual({ screen: "due", date: "2026-08-01" });
  });

  it("names three services in a digest and counts the rest", () => {
    const reminders = planReminders(
      ["a", "b", "c", "d", "e"].map((name, index) =>
        sub({ id: `sub_${index}`, name }),
      ),
      settings(),
      NOW,
      testCopy,
    );

    expect(reminders[0]?.body).toBe("a, b, c and 2 more · ₴500.00");
  });

  // Two lead times over two different renewal days land on one morning. The
  // copy has to stop claiming a single day, and the tap has nowhere specific
  // to go, so it opens the list.
  it("falls back to the list when a group spans different days", () => {
    const reminders = planReminders(
      [
        sub({ nextPaymentDate: "2026-08-02T00:00:00.000Z" }),
        sub({
          id: "sub_2",
          name: "Spotify",
          nextPaymentDate: "2026-08-04T00:00:00.000Z",
        }),
      ],
      settings({ renewalLeadDays: [1, 3] }),
      NOW,
      testCopy,
    );

    const merged = reminders.find((r) => r.title === "Upcoming renewals");
    expect(merged?.target).toEqual({ screen: "list" });
    expect(localParts(merged?.fireAt ?? new Date())).toEqual([
      2026, 7, 1, 9, 0,
    ]);
  });

  it("gives each lead time its own reminder", () => {
    const reminders = planReminders(
      [sub()],
      settings({ renewalLeadDays: [0, 3] }),
      NOW,
      testCopy,
    );

    const first = reminders.filter(
      (r) => r.fireAt.getMonth() === 6 || r.fireAt.getDate() === 1,
    );
    // 1 Aug renewal -> 29 July (3 days) and 1 Aug (same day).
    expect(first.map((r) => localParts(r.fireAt))).toContainEqual([
      2026, 6, 29, 9, 0,
    ]);
    expect(first.map((r) => r.title)).toContain("Netflix renews today");
  });

  // A daily plan with lead times {0,1} projects two charges onto one morning.
  // Both are real, but "Netflix, Netflix" reads as a bug.
  it("never names the same subscription twice in one digest", () => {
    const reminders = planReminders(
      [
        sub({
          period: SubscriptionPeriod.DAY,
          nextPaymentDate: "2026-07-02T00:00:00.000Z",
        }),
      ],
      settings({ renewalLeadDays: [0, 1] }),
      NOW,
      testCopy,
    );

    for (const reminder of reminders) {
      expect(reminder.body.match(/Netflix/g)?.length ?? 0).toBeLessThan(2);
    }
  });

  it("keeps the soonest reminders when the budget is exceeded", () => {
    const reminders = planReminders(
      Array.from({ length: 10 }, (_, index) =>
        sub({
          id: `sub_${index}`,
          name: `s${index}`,
          // A distinct day each, so nothing groups and every one costs a slot.
          nextPaymentDate: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
        }),
      ),
      settings(),
      NOW,
      testCopy,
      3,
    );

    expect(reminders).toHaveLength(3);
    expect(reminders.map((r) => localParts(r.fireAt).slice(0, 3))).toEqual([
      [2026, 6, 31],
      [2026, 7, 1],
      [2026, 7, 2],
    ]);
  });

  // The status footnote asks for one slot MORE than it can schedule, because
  // getting that extra one back is the only evidence a reminder was really
  // dropped. An exactly-full plan must not answer yes — the screen would claim a
  // truncation that never happened.
  it("returns more than the budget only when something was really dropped", () => {
    const days = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        sub({
          id: `sub_${index}`,
          name: `s${index}`,
          nextPaymentDate: `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
        }),
      );

    // One monthly subscription is exactly REMINDER_LOOKAHEAD mornings.
    expect(
      planReminders(days(1), settings(), NOW, testCopy, REMINDER_LOOKAHEAD + 1),
    ).toHaveLength(REMINDER_LOOKAHEAD);
    expect(
      planReminders(days(2), settings(), NOW, testCopy, REMINDER_LOOKAHEAD + 1),
    ).toHaveLength(REMINDER_LOOKAHEAD + 1);
  });
});

describe("planReminders — trials", () => {
  const trialSub = (overrides: Partial<ReminderInput> = {}) =>
    sub({
      // The subscription's own billing is the TRIAL price — zero.
      billing: billing(0),
      pricePhases: [
        { kind: "trial", isActive: true, endsAt: "2026-08-01T00:00:00.000Z" },
      ],
      upcomingPhase: { billing: billing(250) },
      ...overrides,
    });

  it("warns before a trial turns into a charge, priced from the next phase", () => {
    const reminders = planReminders(
      [trialSub()],
      settings({ renewals: false, trials: true }),
      NOW,
      testCopy,
    );

    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.title).toBe("Netflix trial ends tomorrow");
    // 250 from `upcomingPhase`, NOT 0 from the trial's own `cost`.
    expect(reminders[0]?.body).toBe("trial ₴250.00");
  });

  it("still warns when the follow-on price is unknown", () => {
    const reminders = planReminders(
      [trialSub({ upcomingPhase: null })],
      settings({ renewals: false, trials: true }),
      NOW,
      testCopy,
    );

    expect(reminders[0]?.body).toBe("trial no amount");
  });

  it("ignores a phase that is not an active trial", () => {
    const reminders = planReminders(
      [
        trialSub({
          pricePhases: [
            {
              kind: "intro",
              isActive: true,
              endsAt: "2026-08-01T00:00:00.000Z",
            },
            {
              kind: "trial",
              isActive: false,
              endsAt: "2026-08-01T00:00:00.000Z",
            },
          ],
        }),
      ],
      settings({ renewals: false, trials: true }),
      NOW,
      testCopy,
    );

    expect(reminders).toEqual([]);
  });

  // Different kinds are deliberately NOT merged: a trial warning is urgent and
  // differently framed, and burying it in a renewal digest loses that.
  it("keeps a trial warning separate from a renewal on the same morning", () => {
    const reminders = planReminders(
      [trialSub({ id: "trial_1" }), sub({ id: "sub_2", name: "Spotify" })],
      settings({ renewals: true, trials: true }),
      NOW,
      testCopy,
    );

    const sameMorning = reminders.filter(
      (r) => r.fireAt.getDate() === 31 && r.fireAt.getMonth() === 6,
    );
    expect(sameMorning).toHaveLength(2);
    expect(sameMorning.map((r) => r.kind).sort()).toEqual([
      "renewal",
      "trialEnd",
    ]);
  });

  // The due screen looks rows up by `nextPaymentDate`. A trial digest shares a
  // date with nothing it can find, so pointing it there opens an empty screen.
  it("never sends a trial digest to the due-date screen", () => {
    const reminders = planReminders(
      [trialSub({ id: "t1" }), trialSub({ id: "t2", name: "Notion" })],
      settings({ renewals: false, trials: true }),
      NOW,
      testCopy,
    );

    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.title).toBe("Trials ending tomorrow");
    expect(reminders[0]?.target).toEqual({ screen: "list" });
  });

  it("schedules nothing for either kind while its switch is off", () => {
    expect(
      planReminders(
        [trialSub()],
        settings({ renewals: false, trials: false }),
        NOW,
        testCopy,
      ),
    ).toEqual([]);
  });
});

describe("planReminders — the shared recurrence engine", () => {
  // The private engine this replaced checked only `status === "active"`, which
  // happens to be right — this pins the shared one to the same rule.
  it("produces nothing for a paused subscription", () => {
    // The control: the same subscription, active, DOES produce reminders.
    // Without it the assertion below would pass for the wrong reason.
    expect(
      planReminders([sub()], settings(), NOW, testCopy).length,
    ).toBeGreaterThan(0);
    expect(
      planReminders([sub({ status: "paused" })], settings(), NOW, testCopy),
    ).toHaveLength(0);
  });

  // Jan 31 monthly clamps to Feb 28 and then returns to Mar 31. Measuring from
  // the anchor every time is what makes that work — stepping from the clamped
  // occurrence would drag every later one back to the 28th and keep it there.
  it("clamps a month-end occurrence without dragging the rest back", () => {
    const reminders = planReminders(
      [sub({ nextPaymentDate: "2027-01-31T00:00:00.000Z" })],
      settings({ renewalLeadDays: [0] }),
      new Date(2027, 0, 1),
      testCopy,
    );

    expect(reminders.map((r) => r.fireAt.getDate())).toEqual([31, 28, 31]);
  });
});
