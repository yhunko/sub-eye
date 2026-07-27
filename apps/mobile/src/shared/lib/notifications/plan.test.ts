import { describe, expect, it, mock } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import type { RenewalInput } from "./plan";

// Paraglide's runtime touches expo-localization through the i18n barrel; stub
// the two message functions so this stays a pure unit test of the projection.
mock.module("@/shared/i18n", () => ({
  m: {
    notif_renewalTitle: ({ name }: { name: string }) => `${name} renews`,
    notif_renewalBody: ({ amount }: { amount: string }) => amount,
  },
}));

const { planRenewalReminders, REMINDER_LOOKAHEAD } = await import("./plan");

// Local time, so `now` is comparable to the device-zone instants the planner
// returns regardless of which zone the test runs in.
const NOW = new Date(2026, 6, 1, 12);

const sub = (overrides: Partial<RenewalInput> = {}): RenewalInput => ({
  id: "sub_1",
  name: "Netflix",
  cost: 100,
  currency: "uah",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  nextPaymentDate: "2026-08-01T00:00:00.000Z",
  status: "active",
  ...overrides,
});

/** [year, month, day, hour] in the DEVICE zone — that is where reminders fire. */
const localParts = (date: Date) => [
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
  date.getHours(),
];

describe("planRenewalReminders", () => {
  it("fires the day before the renewal, at 09:00 device time", () => {
    const reminders = planRenewalReminders([sub()], NOW);

    // 1 August renews -> 31 July 09:00, rolling back over the month boundary.
    expect(reminders.map((r) => localParts(r.fireAt))[0]).toEqual([
      2026, 6, 31, 9,
    ]);
    expect(reminders[0]?.subscriptionId).toBe("sub_1");
    expect(reminders[0]?.title).toBe("Netflix renews");
    expect(reminders[0]?.body).toBe("₴100.00");
  });

  it("schedules several occurrences ahead, clamping short months", () => {
    const reminders = planRenewalReminders(
      [sub({ nextPaymentDate: "2026-12-31T00:00:00.000Z" })],
      NOW,
    );

    expect(reminders).toHaveLength(REMINDER_LOOKAHEAD);
    // 31 Dec, then 31 Jan, then 28 Feb (clamped) — each reminder a day earlier.
    // Projecting from the anchor rather than stepping is what keeps the third
    // occurrence on the 28th instead of dragging it to 27 Feb.
    expect(reminders.map((r) => localParts(r.fireAt))).toEqual([
      [2026, 11, 30, 9],
      [2027, 0, 30, 9],
      [2027, 1, 27, 9],
    ]);
  });

  it("sorts by fire time and trims to the budget, keeping the soonest", () => {
    // Five yearly subscriptions, deliberately out of date order.
    const subscriptions = ["09", "12", "11", "08", "10"].map((month, index) =>
      sub({
        id: `sub_${index}`,
        nextPaymentDate: `2026-${month}-20T00:00:00.000Z`,
        period: SubscriptionPeriod.YEAR,
      }),
    );

    const reminders = planRenewalReminders(subscriptions, NOW, 3);

    // 15 candidates in, 3 out: the three soonest, in order. This is the iOS-64
    // trap — past the cap iOS keeps the soonest and drops the rest silently, so
    // the planner has to make that choice itself rather than discover it.
    expect(reminders).toHaveLength(3);
    expect(reminders.map((r) => localParts(r.fireAt))).toEqual([
      [2026, 7, 19, 9],
      [2026, 8, 19, 9],
      [2026, 9, 19, 9],
    ]);
  });

  it("produces nothing for renewals already in the past", () => {
    const reminders = planRenewalReminders(
      [
        sub({
          nextPaymentDate: "2020-01-01T00:00:00.000Z",
          period: SubscriptionPeriod.YEAR,
        }),
      ],
      NOW,
    );

    expect(reminders).toEqual([]);
  });

  it("produces nothing for paused, cancelling or cancelled subscriptions", () => {
    // `subscriptionStatuses`, not the lifecycle vocabulary — the two never match.
    const subscriptions = (["paused", "cancelling", "cancelled"] as const).map(
      (status) => sub({ id: `sub_${status}`, status }),
    );

    expect(planRenewalReminders(subscriptions, NOW)).toEqual([]);
  });
});
