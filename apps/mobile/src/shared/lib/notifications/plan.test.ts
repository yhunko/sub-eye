import { describe, expect, it, mock } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import type { ReminderInput } from "./plan";
import type { NotificationSettings } from "./settings";

// Paraglide's runtime touches expo-localization through the i18n barrel; stub
// the message functions so this stays a pure unit test of the projection.
// Each stub echoes its inputs so an assertion can tell the shapes apart.
mock.module("@/shared/i18n", () => ({
  m: {
    notif_whenToday: () => "today",
    notif_whenTomorrow: () => "tomorrow",
    notif_whenInDays: ({ days }: { days: number }) => `in ${days} days`,
    notif_renewalTitle: ({ name, when }: { name: string; when: string }) =>
      `${name} renews ${when}`,
    notif_renewalBody: ({ amount }: { amount: string }) => amount,
    notif_renewalDigestTitle: ({ when }: { when: string }) =>
      `Renewing ${when}`,
    notif_renewalDigestTitleMixed: () => "Upcoming renewals",
    notif_trialTitle: ({ name, when }: { name: string; when: string }) =>
      `${name} trial ends ${when}`,
    notif_trialBody: ({ amount }: { amount: string }) => `trial ${amount}`,
    notif_trialBodyNoAmount: () => "trial no amount",
    notif_trialDigestTitle: ({ when }: { when: string }) =>
      `Trials ending ${when}`,
    notif_trialDigestTitleMixed: () => "Trials ending soon",
    notif_digestBody: ({ names, amount }: { names: string; amount: string }) =>
      `${names} · ${amount}`,
    notif_digestMore: ({ names, count }: { names: string; count: number }) =>
      `${names} and ${count} more`,
  },
}));

const { planReminders, REMINDER_LOOKAHEAD } = await import("./plan");

// Local time, so `now` is comparable to the device-zone instants the planner
// returns regardless of which zone the test runs in.
const NOW = new Date(2026, 6, 1, 12);

const settings = (
  overrides: Partial<NotificationSettings> = {},
): NotificationSettings => ({
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
    );

    expect(reminders[0]?.body).toBe("₴410.00");
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
    );

    expect(reminders[0]?.body).toBe("Netflix, Spotify · ₴500.00");
  });

  it("schedules several occurrences ahead, clamping short months", () => {
    const reminders = planReminders(
      [sub({ nextPaymentDate: "2026-12-31T00:00:00.000Z" })],
      settings(),
      NOW,
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
      planReminders([sub({ status: "cancelling" })], settings(), NOW),
    ).toEqual([]);
  });

  // The core of the digest: without grouping these are two banners on the same
  // minute, and the pair costs two of the 56 iOS slots instead of one.
  it("merges same-instant renewals into one notification", () => {
    const reminders = planReminders(
      [sub(), sub({ id: "sub_2", name: "Spotify", billing: billing(50) })],
      settings(),
      NOW,
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
      3,
    );

    expect(reminders).toHaveLength(3);
    expect(reminders.map((r) => localParts(r.fireAt).slice(0, 3))).toEqual([
      [2026, 6, 31],
      [2026, 7, 1],
      [2026, 7, 2],
    ]);
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
      ),
    ).toEqual([]);
  });
});
