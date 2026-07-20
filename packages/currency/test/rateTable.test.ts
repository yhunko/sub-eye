import { describe, expect, it } from "bun:test";
import { extractRateTable } from "../src/rateTable";

describe("extractRateTable", () => {
  // The CDN returns a nested envelope keyed by the LOWERCASE base currency.
  // This proves we unwrap it with a lowercased key even when the caller passes
  // the base in uppercase — the exact normalization the old CurrencyService did.
  it("unwraps the envelope using a lowercased base key", () => {
    const response = {
      date: "2026-07-20",
      usd: { eur: 0.92, uah: 41.5 },
    };

    expect(extractRateTable(response, "USD")).toEqual({ eur: 0.92, uah: 41.5 });
    expect(extractRateTable(response, "usd")).toEqual({ eur: 0.92, uah: 41.5 });
  });

  // A null response means the upstream fetch failed with no usable cache.
  // Returning {} (not throwing, not null) is load-bearing: CurrencyUtils.convert
  // falls back to a 1:1 rate on a missing key, so the app degrades to
  // "show the original amount" instead of erroring on the dashboard.
  it("returns an empty table for a null response", () => {
    expect(extractRateTable(null, "usd")).toEqual({});
  });

  // Same degradation path when the envelope exists but lacks the base key.
  it("returns an empty table when the base key is absent", () => {
    expect(
      extractRateTable({ date: "2026-07-20", eur: { usd: 1.08 } }, "gbp"),
    ).toEqual({});
  });
});
