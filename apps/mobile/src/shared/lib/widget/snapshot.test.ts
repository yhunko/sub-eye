import { describe, expect, it, mock } from "bun:test";
import type { UpcomingRenewalDto } from "@subeye/model";

// Paraglide's runtime touches expo-localization through the i18n barrel; stub
// the message functions so this stays a pure unit test of the projection. Each
// stub echoes its inputs so an assertion can tell the shapes apart.
mock.module("@/shared/i18n", () => ({
  // Unused here, but the format barrel reaches `when`, which asks the stubbed
  // barrel for this at import time.
  dateLocale: () => "en-GB",
  m: {
    paywall_lockWidgets: () => "Widgets are Pro",
    paywall_unlock: () => "Unlock",
    widget_thisMonth: () => "This month",
    widget_upcoming: () => "Upcoming",
    widget_nothingDue: () => "Nothing due",
    detail_nextPayment: () => "Next payment",
    widget_vsLastMonth: () => "vs last month",
    widget_alsoDue: ({ count }: { count: number }) => `+${count} also due`,
  },
}));

const { buildWidgetSnapshot } = await import("./snapshot");

const renewal = (
  overrides: Partial<UpcomingRenewalDto> = {},
): UpcomingRenewalDto => ({
  id: "sub-1",
  name: "Netflix",
  brandDomain: "netflix.com",
  provider: "netflix",
  amount: 5.99,
  currencyCode: "GBP",
  nextPaymentDate: "2026-08-14T00:00:00.000Z",
  daysUntil: 3,
  ...overrides,
});

const input = (overrides: Partial<Parameters<typeof buildWidgetSnapshot>[0]>) =>
  buildWidgetSnapshot({
    locked: false,
    currency: "GBP",
    monthTotal: 45.99,
    previousMonthTotal: 33.99,
    upcoming: [renewal()],
    ...overrides,
  });

describe("buildWidgetSnapshot", () => {
  it("carries no figures at all when locked", () => {
    const snapshot = input({ locked: true });

    // The whole point of the locked branch: a Home Screen is visible to anyone
    // standing behind the user, so a free account must not have its totals
    // written to shared storage in the first place.
    expect(snapshot.locked).toBe(true);
    expect(snapshot.monthTotal).toBe("");
    expect(snapshot.items).toEqual([]);
    expect(snapshot.delta).toBeNull();
  });

  it("hides the delta when the monthly summary has not loaded", () => {
    expect(input({ previousMonthTotal: null }).delta).toBeNull();
  });

  it("hides the delta when the rounded months are equal", () => {
    // 46 vs 46 after rounding — without this the widget draws an arrow beside
    // "£0", which reads as a broken comparison rather than as "no change".
    const snapshot = input({ monthTotal: 45.99, previousMonthTotal: 46.2 });

    expect(snapshot.delta).toBeNull();
    expect(snapshot.deltaUp).toBe(false);
  });

  it("points the delta up when this month costs more", () => {
    const snapshot = input({ monthTotal: 45.99, previousMonthTotal: 33.99 });

    expect(snapshot.deltaUp).toBe(true);
    // Absolute value — the arrow, not the number, carries the sign.
    expect(snapshot.delta).toBe("£12");
  });

  it("points the delta down when this month costs less", () => {
    const snapshot = input({ monthTotal: 20, previousMonthTotal: 33.99 });

    expect(snapshot.deltaUp).toBe(false);
    expect(snapshot.delta).toBe("£14");
  });

  it("counts only the renewals sharing the first one's day", () => {
    const snapshot = input({
      upcoming: [
        renewal({ id: "a", daysUntil: 0 }),
        renewal({ id: "b", daysUntil: 0 }),
        renewal({ id: "c", daysUntil: 4 }),
      ],
    });

    expect(snapshot.alsoDue).toBe("+1 also due");
  });

  it("has no also-due line for a lone next payment", () => {
    expect(input({ upcoming: [renewal()] }).alsoDue).toBeNull();
    expect(input({ upcoming: [] }).alsoDue).toBeNull();
  });

  it("keeps three items and passes the date through unformatted", () => {
    const snapshot = input({
      upcoming: [
        renewal({ id: "a" }),
        renewal({ id: "b" }),
        renewal({ id: "c" }),
        renewal({ id: "d" }),
      ],
    });

    expect(snapshot.items.map((item) => item.id)).toEqual(["a", "b", "c"]);
    // The widget renders this relatively and re-renders itself on WidgetKit's
    // schedule; a formatted string here would freeze "in 3 days" into the file.
    expect(snapshot.items[0]?.date).toBe("2026-08-14T00:00:00.000Z");
    expect(snapshot.items[0]?.amount).toBe("£5.99");
  });
});
