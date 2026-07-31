import { describe, expect, it } from "bun:test";
// Reaching into apps/mobile deliberately, and only from a test: that module
// imports nothing at all, and its five codes are the claim this page makes out
// loud. A sixth currency in the app should fail here, not ship a page that says
// "five currencies" while the product supports six.
import { CURRENCY_CODES } from "../../mobile/src/shared/lib/format/money";
import { currencyMockup, supportedCurrencies } from "../src/lib/currencies";
import { money } from "../src/lib/format";
import { proPrice } from "../src/lib/site";
import { priceTimeline } from "../src/lib/timeline";

describe("price timeline", () => {
  it("is three ordered phases out of the real phase model", () => {
    expect(priceTimeline.map((step) => step.kind)).toEqual([
      "trial",
      "intro",
      "standard",
    ]);
  });

  it("escalates $0.00 → $4.99 → $12.99 per month", () => {
    expect(priceTimeline.map((step) => step.monthly)).toEqual([0, 4.99, 12.99]);
    expect(
      priceTimeline.map((step) => money(step.monthly, step.currency)),
    ).toEqual(["$0.00", "$4.99", "$12.99"]);
  });

  it("spans 30 days, then 3 months, then opens in month 4", () => {
    expect(priceTimeline[0]?.spanDays).toBe(30);
    expect(priceTimeline[1]?.spanMonths).toBe(3);
    expect(priceTimeline[2]?.startMonth).toBe(4);
    // Open-ended: the standard price is the one that never expires.
    expect(priceTimeline[2]?.spanDays).toBeNull();
  });

  it("marks only the trial live, matching effectivePhaseKind at the origin", () => {
    expect(priceTimeline.map((step) => step.isActive)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe("currency mockup", () => {
  it("converts into the reader's home currency by dividing the rate", () => {
    const en = currencyMockup("en");
    expect(en.homeCurrency).toBe("usd");
    // ₴199 at 42 UAH to the dollar. A multiplication here would read ₴8,358.
    expect(en.rows[0]?.converted).toBeCloseTo(4.738, 3);
    expect(en.rows[1]?.converted).toBe(15.99);
    expect(en.total).toBeCloseTo(33.73, 2);
  });

  it("totals the same basket in hryvnia for the Ukrainian page", () => {
    const uk = currencyMockup("uk");
    expect(uk.homeCurrency).toBe("uah");
    expect(uk.rows[1]?.converted).toBeCloseTo(671.58, 2);
    expect(uk.total).toBeCloseTo(1416.58, 2);
  });

  it("claims exactly the currencies the app ships", () => {
    const claimed: string[] = [...supportedCurrencies];
    expect(claimed.sort()).toEqual([...CURRENCY_CODES].sort());
  });
});

describe("pro price", () => {
  it("is one number behind the pricing section and the JSON-LD offer", () => {
    expect(proPrice.usd).toBe(11.99);
    expect(money(proPrice.usd, "usd")).toBe("$11.99");
    // The euro storefront is quoted on the page too, so it is pinned here.
    expect(money(proPrice.eur, "eur")).toBe("€9.99");
    // Trailing symbol, non-breaking space — see the note in src/lib/format.ts.
    expect(money(proPrice.uah, "uah", 0)).toBe("199\u00a0₴");
  });
});
