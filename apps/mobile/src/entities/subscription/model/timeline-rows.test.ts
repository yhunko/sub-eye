import { describe, expect, it } from "bun:test";
import type { PricePhaseDto } from "@subeye/model";
import { toTimelineRows } from "./timeline-rows";

const phase = (over: Partial<PricePhaseDto> = {}): PricePhaseDto => ({
  id: "p1",
  kind: "standard",
  cost: 1299,
  currency: "uah",
  startsAt: "2026-03-01T00:00:00.000Z",
  endsAt: null,
  isActive: true,
  billing: {
    original: { currencyCode: "uah", monthly: 1299 },
    preferred: {
      currencyCode: "uah",
      amount: 1299,
      monthly: 1299,
      yearly: 15588,
      exchangeRate: 1,
    },
  },
  ...over,
});

describe("toTimelineRows", () => {
  // The server assembles and orders the schedule. A future contributor's instinct
  // will be to sort here; that is the duplicated logic this whole model removes.
  it("preserves the server's order — it must not re-sort", () => {
    const rows = toTimelineRows(
      [
        phase({ id: "newer", startsAt: "2026-03-01T00:00:00.000Z" }),
        phase({ id: "older", startsAt: "2025-12-01T00:00:00.000Z" }),
      ],
      "en-GB",
    );

    expect(rows.map((row) => row.id)).toEqual(["newer", "older"]);
  });

  it("leaves an open-ended phase without an end", () => {
    const [row] = toTimelineRows([phase({ endsAt: null })], "en-GB");

    expect(row?.from).toContain("2026");
    expect(row?.to).toBeNull();
  });

  it("gives a closed phase both ends", () => {
    const [row] = toTimelineRows(
      [
        phase({
          startsAt: "2026-01-01T00:00:00.000Z",
          endsAt: "2026-03-01T00:00:00.000Z",
        }),
      ],
      "en-GB",
    );

    expect(row?.from).toContain("Jan");
    expect(row?.to).toContain("Mar");
  });

  // The kind travels as-is; turning it into copy is the widget's job, which is
  // what keeps this module free of the i18n runtime.
  it("passes the phase kind and active flag straight through", () => {
    const [row] = toTimelineRows(
      [phase({ kind: "trial", cost: 0, isActive: false })],
      "en-GB",
    );

    expect(row?.kind).toBe("trial");
    expect(row?.isActive).toBe(false);
  });

  it("formats the price with the currency's symbol", () => {
    const [row] = toTimelineRows(
      [phase({ cost: 1299, currency: "uah" })],
      "en-GB",
    );

    expect(row?.price).toBe("₴1,299.00");
  });

  // Dates are rendered in the user's locale, but the month/year granularity is
  // fixed: a price schedule reads as "Jan – Mar", never as a day-level timestamp.
  it("renders month and year in the given locale", () => {
    const [row] = toTimelineRows([phase()], "en-GB");

    expect(row?.from).toBe("Mar 2026");
  });
});
