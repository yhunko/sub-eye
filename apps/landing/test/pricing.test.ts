import { describe, expect, it } from "bun:test";
import { getLegalDoc, type Inline } from "@subeye/legal";
// Reaching into apps/mobile deliberately, and only from a test: that module
// imports nothing at all, and its catalogue is the claim this page makes out
// loud. The page names a COUNT now rather than five codes, so a currency added
// or dropped in the app should fail here rather than ship a page that says 156
// while the product ships something else.
import { CURRENCY_CODES } from "../../mobile/src/shared/lib/format/money";
import { en } from "../src/i18n/en";
import { uk } from "../src/i18n/uk";
import { currencyMockup } from "../src/lib/currencies";
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

  // The page prints five symbols of its own rather than importing the app's
  // catalogue — but a code it prints that the app cannot hold would be a mockup
  // of something that does not exist.
  it("only prints currencies the app ships", () => {
    const printed = new Set([
      currencyMockup("en").homeCurrency,
      currencyMockup("uk").homeCurrency,
      ...currencyMockup("en").rows.map((row) => row.currency),
      ...Object.keys(proPrice),
    ]);

    for (const code of printed) expect(CURRENCY_CODES).toContain(code);
  });
});

// "the page cannot lie about the product" is the whole reason this workspace has
// tests at all. Both locales name the size of the catalogue in prose, and prose
// is exactly what nothing else would catch drifting.
describe("the currency claim", () => {
  it("names the number of currencies the app actually ships", () => {
    const count = String(CURRENCY_CODES.length);

    expect(en.does.currency.body).toContain(count);
    expect(uk.does.currency.body).toContain(count);
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

  // `@subeye/legal` may not import this file — a package importing an app is a
  // boundary error — so the terms quote the price as a formatted literal, and
  // this is what stops the two drifting. A price change that misses the terms
  // leaves a document the user agreed to quoting the old number, which is why
  // it has to fail here rather than anywhere later.
  it("is quoted by the terms of service, in both languages", () => {
    const plain = (run: Inline) =>
      typeof run === "string"
        ? run
        : "code" in run
          ? run.code
          : "b" in run
            ? run.b
            : "";

    for (const locale of ["en", "uk"]) {
      const prose = getLegalDoc("terms-of-service", locale)
        .sections.flatMap((section) => section.blocks)
        .flatMap((block) => ("p" in block ? block.p : []))
        .map(plain)
        .join("");

      expect(prose).toContain(money(proPrice.usd, "usd"));
      expect(prose).toContain(money(proPrice.uah, "uah", 0));
    }
  });
});
