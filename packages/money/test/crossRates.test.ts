import { describe, expect, it } from "bun:test";
import { CurrencyUtils } from "../src";

// "units of <code> per 1 UAH" and "units of <code> per 1 USD"
const uahRates = { usd: 1 / 41.5, uah: 1, eur: 0.92 / 41.5 };
const usdRates = { usd: 1, uah: 41.5, eur: 0.92 };

describe("CurrencyUtils.convert", () => {
  it("divides by the source rate: 10 USD is about 415 UAH", () => {
    expect(CurrencyUtils.convert(10, "usd", "uah", uahRates)).toBeCloseTo(
      415,
      6,
    );
  });

  it("round-trips an amount back to its original currency", () => {
    const inUah = CurrencyUtils.convert(10, "usd", "uah", uahRates);
    expect(CurrencyUtils.convert(inUah, "uah", "usd", usdRates)).toBeCloseTo(
      10,
      6,
    );
  });
});
