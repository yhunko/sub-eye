import { describe, expect, it } from "bun:test";
import {
  CURRENCY_CODES,
  currencyFlag,
  currencyLabel,
  currencySymbol,
  formatMoney,
  POPULAR_CURRENCY_CODES,
  supportedCurrencyCode,
} from "./money";

describe("formatMoney", () => {
  // The home currency. A user scanning three numbers needs the symbol, not a code.
  it("renders a known currency with its symbol", () => {
    expect(formatMoney(1234.5, "uah")).toBe("₴1,234.50");
  });

  it("accepts an upper-case code (forms and the OS may not lower-case)", () => {
    expect(formatMoney(9.99, "USD")).toBe("$9.99");
  });

  // Falls back rather than throwing: an unknown code must never blank a screen.
  it("falls back to a trailing upper-case code when the currency is unknown", () => {
    expect(formatMoney(10, "xyz")).toBe("10.00 XYZ");
  });

  // A third of the catalogue has no symbol in CLDR beyond the code itself.
  // Prefixing it gives "AED1,234.50", which reads as a typo rather than money.
  it("trails a code-as-symbol instead of prefixing it", () => {
    expect(formatMoney(1234.5, "aed")).toBe("1,234.50 AED");
  });

  it("honours an explicit decimals override (used by the big Home numbers)", () => {
    expect(formatMoney(48210.4, "uah", { decimals: 0 })).toBe("₴48,210");
  });
});

// The device→SubEye currency mapping behind the first-run seed. Getting this
// wrong writes the WRONG home currency onto a brand-new install, and every
// amount in the app is then converted through it.
describe("supportedCurrencyCode", () => {
  // getLocales() reports ISO-4217 in upper case; the store keeps lower.
  it("normalises a supported region code to lower case", () => {
    expect(supportedCurrencyCode("EUR")).toBe("eur");
  });

  it("accepts every code the app can render", () => {
    for (const code of CURRENCY_CODES) {
      expect(supportedCurrencyCode(code.toUpperCase())).toBe(code);
    }
  });

  // A user in Tokyo now keeps their own currency — the catalogue is the whole
  // ISO-4217 fiat set, not the five the app shipped with.
  it("accepts a currency outside the original five", () => {
    expect(supportedCurrencyCode("JPY")).toBe("jpy");
  });

  // Retired codes still carry an FX rate, so they are excluded by hand. A
  // device reporting one must fall back rather than seed a dead currency.
  it("rejects a retired code the rate document still publishes", () => {
    expect(supportedCurrencyCode("DEM")).toBeNull();
    expect(supportedCurrencyCode("HRK")).toBeNull();
  });

  // getLocales()[0]?.currencyCode is `string | null`, and the index may be empty.
  it("rejects null, undefined and blank", () => {
    expect(supportedCurrencyCode(null)).toBeNull();
    expect(supportedCurrencyCode(undefined)).toBeNull();
    expect(supportedCurrencyCode("   ")).toBeNull();
  });

  // A bare `CURRENCIES[code]` walks the prototype and calls this one supported.
  it("rejects an Object.prototype key", () => {
    expect(supportedCurrencyCode("constructor")).toBeNull();
  });
});

// Same prototype hole, reached through the formatter: without the guarded
// lookup this renders "undefined1,234.50" instead of falling back.
it("formats an Object.prototype key as an unknown currency", () => {
  expect(formatMoney(1234.5, "constructor")).toBe("1,234.50 CONSTRUCTOR");
});

describe("currencyFlag", () => {
  // The whole reason the picker needs no flag table: ISO 4217 is the ISO 3166
  // country plus a currency initial, so a regional-indicator pair is exact.
  it("derives the flag from the code's country prefix", () => {
    expect(currencyFlag("usd")).toBe("🇺🇸");
    expect(currencyFlag("UAH")).toBe("🇺🇦");
    expect(currencyFlag("eur")).toBe("🇪🇺");
  });

  // "XA" is not a country, and the derivation would render two boxed letters.
  it("overrides the supranational X-codes", () => {
    expect(currencyFlag("xaf")).toBe("🌍");
    expect(currencyFlag("xpf")).toBe("🇵🇫");
  });

  it("answers empty for a code the app does not hold", () => {
    expect(currencyFlag("zzz")).toBe("");
    expect(currencyLabel("zzz")).toBe("ZZZ");
  });
});

// The picker hides the trailing symbol when it is the code again — otherwise
// every second row shows the same three letters twice.
it("reports no symbol where CLDR only has the code", () => {
  expect(currencySymbol("usd")).toBe("$");
  expect(currencySymbol("aed")).toBeUndefined();
  expect(currencySymbol("zzz")).toBeUndefined();
});

// A suggested row that is not in the catalogue renders a blank flag and no
// name, which is only ever a typo in the constant.
it("suggests only codes the catalogue holds", () => {
  for (const code of POPULAR_CURRENCY_CODES) {
    expect(CURRENCY_CODES).toContain(code);
  }
});
