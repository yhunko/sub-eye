import { describe, expect, it, mock } from "bun:test";

// Its own file, and its own mock of the i18n barrel, for the reason
// `when.test.ts` has one: `mock.module` replaces the barrel for the whole
// process, so the locale cannot be flipped from inside a file that also asserts
// on real messages. Here `dateLocale` is the subject rather than a nuisance —
// these two functions exist only because it can say "uk".
let locale = "en-GB";
mock.module("@/shared/i18n", () => ({ dateLocale: () => locale }));

const { monthNameInPhrase, monthNameLabel } = await import("./month");

const AUGUST = "2026-08-01T00:00:00.000Z";

describe("month names", () => {
  it("gives a Ukrainian month the spelling a preposition in front of it needs", () => {
    // The calendar's chip reads "проти {month}", and "проти" governs the
    // genitive. It shipped as "проти серпень" because `{ month: "long" }`
    // answers with the stand-alone spelling in every locale that has two.
    locale = "uk";
    expect(monthNameInPhrase(AUGUST)).toBe("серпня");
  });

  it("keeps the stand-alone spelling for a month that stands alone", () => {
    // Same month, one screen away, on the year grid — where "серпня" would be
    // the wrong one. The pair has to disagree or neither is doing anything.
    locale = "uk";
    expect(monthNameLabel(AUGUST)).toBe("серпень");
  });

  it("leaves English alone, and takes the borrowed day out with it", () => {
    // en-US formats the pair as "August 1", so stripping only a LEADING number
    // would have shipped the digit.
    locale = "en-US";
    expect(monthNameInPhrase(AUGUST)).toBe("August");
    expect(monthNameLabel(AUGUST)).toBe("August");
  });
});
