import { describe, expect, it } from "bun:test";
import { safeParse } from "valibot";
import { currencyBaseSchema } from "../src/currencySchemas";

describe("currencyBaseSchema", () => {
  // CHARACTERIZATION TEST — locks in today's behaviour so the move is provably
  // faithful. The schema uppercases the input and then checks membership in
  // CurrenciesMap, which is keyed by LOWERCASE codes. Every input therefore
  // fails. This is a real defect; it is dead code today (no importer), and
  // fixing it belongs to Plan 4, which wires this schema into the new routes.
  it("rejects even a supported code, because it uppercases before a lowercase lookup", () => {
    expect(safeParse(currencyBaseSchema, "  usd ").success).toBe(false);
    expect(safeParse(currencyBaseSchema, "uah").success).toBe(false);
  });

  it("rejects a code that is not in CurrenciesMap", () => {
    expect(safeParse(currencyBaseSchema, "XYZ").success).toBe(false);
  });
});
