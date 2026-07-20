import { describe, expect, it } from "bun:test";
import { CurrencyUtils } from "@subeye/shared";
import { deriveRatesFor } from "../src/domains/currency/currencyService";

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
