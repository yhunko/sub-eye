import { describe, expect, it } from "bun:test";
import type { CalendarDayDto } from "@subeye/model";
import { monthGrid, monthIso, nearbyCountdown, needsDayTotal } from "./month";

const days = (cells: ReturnType<typeof monthGrid>) =>
  cells.map((cell) => cell.day);

describe("monthGrid", () => {
  it("puts the 1st in the column its weekday names, both week starts", () => {
    // 1 September 2026 is a Tuesday: one pad under a Monday start, two under a
    // Sunday start. An off-by-one here shifts every tile in the month.
    const monday = monthGrid("2026-09-01T00:00:00.000Z", "monday");
    const sunday = monthGrid("2026-09-01T00:00:00.000Z", "sunday");

    expect(days(monday).slice(0, 3)).toEqual([null, 1, 2]);
    expect(days(sunday).slice(0, 3)).toEqual([null, null, 1]);
  });

  it("pads to whole weeks and holds every day of the month exactly once", () => {
    for (const month of [
      "2026-02-01T00:00:00.000Z", // 28 days starting Sunday — the tight case
      "2026-09-01T00:00:00.000Z",
      "2027-05-01T00:00:00.000Z", // 31 days starting Saturday — spills to 6 rows
    ]) {
      const cells = monthGrid(month, "monday");
      const numbered = cells.filter((cell) => cell.day !== null);

      expect(cells.length % 7).toBe(0);
      expect(new Set(numbered.map((cell) => cell.day)).size).toBe(
        numbered.length,
      );
      expect(numbered[0]?.day).toBe(1);
    }
  });

  it("dates each cell as the UTC midnight the store keys its days by", () => {
    // The grid is looked up against `CalendarMonthDto.days`. A local-midnight
    // date here misses every tile for anyone east or west of UTC.
    const cells = monthGrid("2026-09-01T00:00:00.000Z", "monday");
    expect(cells.find((cell) => cell.day === 12)?.date).toBe(
      "2026-09-12T00:00:00.000Z",
    );
  });
});

describe("monthIso", () => {
  it("walks whole months without landing on the wrong one from a 31st", () => {
    // Naively adding 30 days from 31 August lands in September twice over.
    const from = new Date("2026-08-31T12:00:00.000Z");
    expect(monthIso(0, from)).toBe("2026-08-01T00:00:00.000Z");
    expect(monthIso(1, from)).toBe("2026-09-01T00:00:00.000Z");
    expect(monthIso(-1, from)).toBe("2026-07-01T00:00:00.000Z");
    expect(monthIso(5, from)).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("nearbyCountdown", () => {
  const now = new Date("2026-08-30T09:00:00.000Z");

  it("says nothing about a day that has already gone", () => {
    // `formatCountdown` branches on `days <= 0`, so passing a past day straight
    // to it labelled every settled day in the month "Today" — which the day
    // sheet did, under a heading that said "Friday, August 21".
    expect(nearbyCountdown("2026-08-21T00:00:00.000Z", now)).toBeNull();
    expect(nearbyCountdown("2026-08-29T00:00:00.000Z", now)).toBeNull();
  });

  it("counts down only inside the fortnight the date itself cannot narrate", () => {
    expect(nearbyCountdown("2026-08-30T00:00:00.000Z", now)).toBe("Today");
    expect(nearbyCountdown("2026-08-31T00:00:00.000Z", now)).toBe("Tomorrow");
    expect(nearbyCountdown("2026-09-12T00:00:00.000Z", now)).toBe("in 13 days");
    expect(nearbyCountdown("2026-09-13T00:00:00.000Z", now)).toBeNull();
  });
});

describe("needsDayTotal", () => {
  const event = (kind: string, amount: number) =>
    ({
      key: `k${kind}${amount}`,
      subscriptionId: "s",
      name: "n",
      brandDomain: null,
      kind,
      date: "2026-09-30T00:00:00.000Z",
      amount,
      currencyCode: "uah",
    }) as CalendarDayDto["events"][number];

  const day = (events: CalendarDayDto["events"]): CalendarDayDto => ({
    date: "2026-09-30T00:00:00.000Z",
    total: events
      .filter((e) => e.kind === "payment")
      .reduce((sum, e) => sum + e.amount, 0),
    events,
  });

  it("stays hidden for a single charge, whose row already prints the number", () => {
    // The complaint this exists for: the same amount stacked over itself reads
    // as two charges until you check.
    expect(needsDayTotal(day([event("payment", 133.27)]))).toBe(false);
  });

  it("stays hidden when the extra events are not charges", () => {
    // A renewal plus a cancellation still totals to the renewal.
    expect(
      needsDayTotal(day([event("payment", 133.27), event("ends", 5134.51)])),
    ).toBe(false);
    expect(
      needsDayTotal(day([event("payment", 133.27), event("resumes", 259)])),
    ).toBe(false);
  });

  it("shows once there is something to add up", () => {
    expect(
      needsDayTotal(day([event("payment", 133.27), event("payment", 320.91)])),
    ).toBe(true);
  });

  it("shows for two charges even when one is free, since the rows cannot say so at a glance", () => {
    expect(
      needsDayTotal(day([event("payment", 0), event("payment", 320.91)])),
    ).toBe(true);
  });
});
