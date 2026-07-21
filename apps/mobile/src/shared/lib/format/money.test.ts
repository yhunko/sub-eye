import { describe, expect, it } from "bun:test";
import { formatConverted, formatMoney } from "./money";

describe("formatMoney", () => {
  // The home currency. A user scanning three numbers needs the symbol, not a code.
  it("renders a known currency with its symbol", () => {
    expect(formatMoney(1234.5, "uah")).toBe("₴1,234.50");
  });

  it("accepts an upper-case code (the server sends lower-case, forms may not)", () => {
    expect(formatMoney(9.99, "USD")).toBe("$9.99");
  });

  // Falls back rather than throwing: an unknown code must never blank a screen.
  it("falls back to a trailing upper-case code when the currency is unknown", () => {
    expect(formatMoney(10, "xyz")).toBe("10.00 XYZ");
  });

  it("honours an explicit decimals override (used by the big Home numbers)", () => {
    expect(formatMoney(48210.4, "uah", { decimals: 0 })).toBe("₴48,210");
  });
});

describe("formatConverted", () => {
  // The whole point of multi-currency: the total is UAH, the charge is USD.
  it("appends the original amount when the currencies differ", () => {
    expect(formatConverted(420, "uah", 9.99, "usd")).toBe("₴420.00 · $9.99");
  });

  // No suffix when there is nothing to disclose — avoids "₴420.00 · ₴420.00".
  it("omits the suffix when the currencies match", () => {
    expect(formatConverted(420, "uah", 420, "uah")).toBe("₴420.00");
  });

  it("compares codes case-insensitively", () => {
    expect(formatConverted(420, "UAH", 420, "uah")).toBe("₴420.00");
  });
});
