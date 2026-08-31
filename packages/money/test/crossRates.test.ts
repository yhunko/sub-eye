import { describe, expect, it, test } from "bun:test";
import {
  CurrencyUtils,
  deriveRatesFor,
  fxVersionCandidates,
  readFxDocument,
  STORED_BASE,
} from "../src";

// "units of <code> per 1 USD"
const usdRates = { usd: 1, uah: 41.5, eur: 0.92 };

describe("deriveRatesFor", () => {
  it("returns the source document unchanged when the target is usd", () => {
    expect(deriveRatesFor("usd", usdRates)).toEqual(usdRates);
  });

  it("produces rates expressed in units per one unit of the target", () => {
    const uahRates = deriveRatesFor("uah", usdRates);

    // 1 UAH buys 1/41.5 USD
    expect(uahRates.usd).toBeCloseTo(1 / 41.5, 10);
    expect(uahRates.uah).toBe(1);
    expect(uahRates.eur).toBeCloseTo(0.92 / 41.5, 10);
  });

  it("satisfies CurrencyUtils.convert: 10 USD is about 415 UAH", () => {
    const uahRates = deriveRatesFor("uah", usdRates);

    expect(CurrencyUtils.convert(10, "usd", "uah", uahRates)).toBeCloseTo(
      415,
      6,
    );
  });

  it("round-trips an amount back to its original currency", () => {
    const uahRates = deriveRatesFor("uah", usdRates);
    const usdBack = deriveRatesFor("usd", usdRates);

    const inUah = CurrencyUtils.convert(10, "usd", "uah", uahRates);
    expect(CurrencyUtils.convert(inUah, "uah", "usd", usdBack)).toBeCloseTo(
      10,
      6,
    );
  });

  it("returns an empty table for a target the document does not price", () => {
    expect(deriveRatesFor("xyz", usdRates)).toEqual({});
  });

  it("skips non-finite and zero rates instead of emitting Infinity", () => {
    const dirty = { usd: 1, uah: 41.5, bad: 0, worse: Number.NaN };
    const derived = deriveRatesFor("uah", dirty);

    expect(derived.bad).toBeUndefined();
    expect(derived.worse).toBeUndefined();
    expect(Object.values(derived).every(Number.isFinite)).toBe(true);
  });
});

describe("readFxDocument", () => {
  test("pulls the stored base's table and the document date", () => {
    const result = readFxDocument({
      date: "2026-08-24",
      [STORED_BASE]: { uah: 41.2, eur: 0.86 },
    });

    expect(result).toEqual({
      rates: { uah: 41.2, eur: 0.86 },
      rateDate: "2026-08-24",
    });
  });

  // A malformed document must not throw on a background refresh path — the
  // caller falls through to the next version candidate instead.
  test("returns null when the base key is missing or not an object", () => {
    expect(readFxDocument({ date: "2026-08-24" })).toBeNull();
    expect(
      readFxDocument({ date: "2026-08-24", [STORED_BASE]: "nope" }),
    ).toBeNull();
  });
});

describe("fxVersionCandidates", () => {
  // The publisher's immutable build can lag the UTC date, so yesterday is tried
  // before falling back to the mutable `latest` tag.
  test("today, then yesterday, then latest", () => {
    expect(fxVersionCandidates(new Date("2026-03-01T04:00:00.000Z"))).toEqual([
      "2026.3.1",
      "2026.2.28",
      "latest",
    ]);
  });
});
