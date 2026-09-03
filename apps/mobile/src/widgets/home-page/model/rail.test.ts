import { describe, expect, it } from "bun:test";
import type { CashFlowPoint } from "@subeye/model";
import { buildRail } from "./rail";

// A DEVICE instant, built locally: `buildRail` dates the strip from the device's
// calendar day, so a `…Z` literal here would make every case below pass or fail
// on the host's offset. The forecast's own dates are STORED days, which are
// always UTC midnights — the same split `attention.test.ts` makes.
const NOW = new Date(2026, 8, 3, 12, 0);

const charge = (name: string) => ({
  name,
  brandDomain: `${name.toLowerCase()}.com`,
  amount: 100,
});

/** September 2026, with charges only on the days named. */
const september = (
  charges: Record<
    number,
    { name: string; brandDomain: string; amount: number }[]
  >,
): CashFlowPoint[] =>
  Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const subscriptions = charges[day] ?? [];
    return {
      date: new Date(Date.UTC(2026, 8, day)).toISOString(),
      amount: subscriptions.reduce((sum, item) => sum + item.amount, 0),
      cumulative: 0,
      subscriptions,
    };
  });

describe("buildRail", () => {
  it("starts at today and drops the days already paid", () => {
    const rail = buildRail(september({ 1: [charge("Fastmail")] }), NOW);

    // 3 September through the 30th. A strip that still carried the 1st would be
    // offering the user a day they cannot act on, in the slot the eye reads first.
    expect(rail.length).toBe(28);
    expect(rail[0]?.day).toBe(3);
    expect(rail[0]?.today).toBe(true);
    expect(rail.at(-1)?.day).toBe(30);
  });

  it("rings the next charging day, not today's own charge", () => {
    const rail = buildRail(
      september({ 3: [charge("Fastmail")], 6: [charge("GitHub")] }),
      NOW,
    );

    // Today already has a filled circle; a ring on the same cell is invisible,
    // and the ring's job is to point at the next time money leaves.
    expect(rail[0]?.next).toBe(false);
    expect(rail.filter((day) => day.next).map((day) => day.day)).toEqual([6]);
  });

  it("spends a logo slot on the overflow chip rather than wrapping", () => {
    const rail = buildRail(
      september({
        4: [charge("Fastmail"), charge("Mullvad")],
        5: [charge("Raycast"), charge("Bitwarden"), charge("Cloudflare")],
      }),
      NOW,
    );

    // Two fit. Three do not, so one logo plus "+2" — a second logo row would
    // make a busy day taller than the strip.
    expect(rail[1]?.logos.length).toBe(2);
    expect(rail[1]?.hidden).toBe(0);
    expect(rail[2]?.logos.length).toBe(1);
    expect(rail[2]?.hidden).toBe(2);
  });

  it("breaks the week before Monday, never in front of the first cell", () => {
    const rail = buildRail(september({}), NOW);

    // 7, 14, 21 and 28 September are Mondays. A hairline on the leading cell
    // would be a divider with nothing to its left.
    expect(rail[0]?.weekBreak).toBe(false);
    expect(rail.filter((day) => day.weekBreak).map((day) => day.day)).toEqual([
      7, 14, 21, 28,
    ]);
  });

  it("names the column off the locale rather than the day number", () => {
    const rail = buildRail(september({}), NOW);

    // 3 September 2026 is a Thursday. Read with local accessors instead of UTC
    // ones, every heading in the strip slips a day west of UTC.
    expect(rail[0]?.weekday).toBe("TH");
  });
});
