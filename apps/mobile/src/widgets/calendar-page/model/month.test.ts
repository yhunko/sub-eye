import { describe, expect, it } from "bun:test";
import type { CalendarDayDto } from "@subeye/model";
import {
  isHeavyDay,
  monthDelta,
  monthGrid,
  monthIso,
  monthOffsetOf,
  nearbyCountdown,
  needsDayTotal,
} from "./month";

const days = (cells: ReturnType<typeof monthGrid>) =>
  cells.map((cell) => (cell.adjacent ? null : cell.day));

describe("monthGrid", () => {
  it("puts the 1st in the column its weekday names, both week starts", () => {
    // 1 September 2026 is a Tuesday: one pad under a Monday start, two under a
    // Sunday start. An off-by-one here shifts every tile in the month.
    const monday = monthGrid("2026-09-01T00:00:00.000Z", "monday");
    const sunday = monthGrid("2026-09-01T00:00:00.000Z", "sunday");

    expect(days(monday).slice(0, 3)).toEqual([null, 1, 2]);
    expect(days(sunday).slice(0, 3)).toEqual([null, null, 1]);
  });

  it("is always six rows, whatever the month needs", () => {
    // A pager whose pages are different heights makes the agenda under it jump
    // mid-swipe. February on a Monday start needs four rows; it still gets six.
    for (const month of [
      "2026-02-01T00:00:00.000Z", // 28 days starting Sunday
      "2026-09-01T00:00:00.000Z",
      "2027-05-01T00:00:00.000Z", // 31 days starting Saturday — genuinely 6 rows
    ]) {
      expect(monthGrid(month, "monday")).toHaveLength(42);
      expect(monthGrid(month, "sunday")).toHaveLength(42);
    }
  });

  it("holds every day of the month exactly once, and nothing else", () => {
    for (const month of [
      "2026-02-01T00:00:00.000Z",
      "2026-09-01T00:00:00.000Z",
      "2027-05-01T00:00:00.000Z",
    ]) {
      const own = monthGrid(month, "monday").filter((cell) => !cell.adjacent);
      expect(new Set(own.map((cell) => cell.day)).size).toBe(own.length);
      expect(own[0]?.day).toBe(1);
    }
  });

  it("fills every slot the month does not use with the neighbouring months", () => {
    // A fixed six rows leaves February two whole rows it never reaches, and a
    // blank quarter-screen under the last week reads as a failed load.
    const cells = monthGrid("2026-09-01T00:00:00.000Z", "monday");
    expect(cells.every((cell) => cell.date !== null)).toBe(true);
    expect(cells.filter((cell) => cell.adjacent)).not.toHaveLength(0);
  });

  it("continues into the real neighbouring days, not into repeated numbers", () => {
    // 1 September 2026 is a Tuesday, so the grid opens on 31 August and — six
    // rows being more than September needs — runs out into October.
    const cells = monthGrid("2026-09-01T00:00:00.000Z", "monday");

    expect(cells[0]).toEqual({
      key: "2026-08-31T00:00:00.000Z",
      day: 31,
      date: "2026-08-31T00:00:00.000Z",
      adjacent: true,
    });
    expect(cells[31]).toEqual({
      key: "2026-10-01T00:00:00.000Z",
      day: 1,
      date: "2026-10-01T00:00:00.000Z",
      adjacent: true,
    });
  });

  it("crosses a year boundary without inventing a month", () => {
    // The trap a hand-rolled neighbour would fall into: January's leading days
    // belong to the DECEMBER BEFORE, not to December of the same year.
    const january = monthGrid("2026-01-01T00:00:00.000Z", "monday");
    expect(january[0]?.date).toBe("2025-12-29T00:00:00.000Z");

    const december = monthGrid("2026-12-01T00:00:00.000Z", "monday");
    expect(december[december.length - 1]?.date).toBe(
      "2027-01-10T00:00:00.000Z",
    );
  });

  it("keeps the neighbouring days in a strict daily sequence across the grid", () => {
    // One shared walk, so an off-by-one anywhere in it shows up as a gap or a
    // repeat rather than as a plausible-looking tile.
    for (const month of [
      "2026-02-01T00:00:00.000Z",
      "2027-05-01T00:00:00.000Z",
    ]) {
      const cells = monthGrid(month, "sunday");
      for (let index = 1; index < cells.length; index++) {
        const previous = Date.parse(cells[index - 1]?.date as string);
        expect(Date.parse(cells[index]?.date as string) - previous).toBe(
          86_400_000,
        );
      }
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

describe("monthOffsetOf", () => {
  const now = new Date("2026-09-01T09:00:00.000Z");

  it("round-trips every offset the pager can reach", () => {
    // The year view hands a month string back to a pager that speaks offsets.
    // Dividing a millisecond difference by an average month is off by one over
    // any span containing February, which lands the user on the wrong month.
    for (let offset = -24; offset <= 24; offset++) {
      expect(monthOffsetOf(monthIso(offset, now), now)).toBe(offset);
    }
  });

  it("counts whole months across a year boundary", () => {
    expect(monthOffsetOf("2026-02-01T00:00:00.000Z", now)).toBe(-7);
    expect(monthOffsetOf("2027-01-01T00:00:00.000Z", now)).toBe(4);
  });
});

describe("isHeavyDay", () => {
  const charge = (amount: number) =>
    ({
      key: `k${amount}`,
      subscriptionId: "sub",
      name: "Netflix",
      brandDomain: null,
      kind: "payment",
      date: "2026-09-30T00:00:00.000Z",
      amount,
      currencyCode: "uah",
    }) as CalendarDayDto["events"][number];

  const notice = {
    ...charge(500),
    key: "notice",
    kind: "ends",
  } as CalendarDayDto["events"][number];

  const day = (events: CalendarDayDto["events"]): CalendarDayDto => ({
    date: "2026-09-30T00:00:00.000Z",
    total: events
      .filter((event) => event.kind === "payment")
      .reduce((sum, event) => sum + event.amount, 0),
    events,
  });

  it("flags several charges landing together on a real share of the month", () => {
    expect(isHeavyDay(day([charge(300), charge(300)]), 1000)).toBe(true);
  });

  it("ignores the only charge in a quiet month, which is not a pile-up", () => {
    // The whole month on one day is 100% of it and still tells the user nothing:
    // there is no second charge for it to have landed WITH.
    expect(isHeavyDay(day([charge(1000)]), 1000)).toBe(false);
  });

  it("ignores a cluster of small charges in an expensive month", () => {
    // Four tiny charges in a month that spends a thousand is noise, and this is
    // the one flag on the screen that must not cry wolf.
    expect(
      isHeavyDay(day([charge(3), charge(3), charge(3), charge(3)]), 1000),
    ).toBe(false);
  });

  it("does not count dated notices towards the charge count", () => {
    // An ending moves no money. One renewal beside it is still one renewal.
    expect(isHeavyDay(day([charge(600), notice]), 1000)).toBe(false);
  });

  it("never divides by an empty month", () => {
    expect(isHeavyDay(day([charge(0), charge(0)]), 0)).toBe(false);
  });

  it("takes a day sitting exactly on the threshold", () => {
    expect(isHeavyDay(day([charge(125), charge(125)]), 1000)).toBe(true);
  });
});

describe("monthDelta", () => {
  it("reports the size and the direction, never a signed amount", () => {
    // The caller pairs the number with its own arrow and colour, so a negative
    // would print as "↓ -₴80".
    expect(monthDelta(920, 1000)).toEqual({ amount: 80, up: false });
    expect(monthDelta(1080, 1000)).toEqual({ amount: 80, up: true });
  });

  it("says nothing about a month with no predecessor", () => {
    // A first month is not a 100% rise, and dividing into it is how that gets
    // printed.
    expect(monthDelta(500, 0)).toBeNull();
  });

  it("says nothing when the month did not move", () => {
    // The common case: an unchanged set of subscriptions bills the same amount
    // every month, and "↑ ₴0" costs a fold to say so.
    expect(monthDelta(1000, 1000)).toBeNull();
  });

  it("does not surface sub-unit drift as a change", () => {
    // The chip prints whole units, so anything under one renders as "↑ ₴0 more"
    // — a red arrow next to nothing. Home rounds both sides before comparing and
    // so does this.
    expect(monthDelta(1000.4, 1000.1)).toBeNull();
    expect(monthDelta(0.1 + 0.2, 0.3)).toBeNull();
  });

  it("still reports a move of one whole unit", () => {
    // The rounding above must not swallow the smallest real change.
    expect(monthDelta(1001, 1000)).toEqual({ amount: 1, up: true });
  });
});
