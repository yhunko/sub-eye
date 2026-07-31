import { describe, expect, it } from "bun:test";
import { chargeBeforeCancellation } from "./cancellation";

describe("chargeBeforeCancellation", () => {
  // The end-of-period path, and the reason the card can promise "no further
  // charges" at all: the service sets `willBeCancelledAt` to exactly this date,
  // and `shouldIncludeOccurrence` excludes an occurrence that lands on it.
  it("reports nothing when the cancellation lands on the next payment", () => {
    expect(
      chargeBeforeCancellation({
        nextPaymentDate: "2026-09-29T00:00:00.000Z",
        willBeCancelledAt: "2026-09-29T00:00:00.000Z",
      }),
    ).toBeNull();
  });

  // `edit` can push the date past one or more payments. Claiming "no further
  // charges" here would be telling the user money will not move when it will.
  it("reports the next payment when the cancellation is further out", () => {
    expect(
      chargeBeforeCancellation({
        nextPaymentDate: "2026-08-29T00:00:00.000Z",
        willBeCancelledAt: "2026-12-29T00:00:00.000Z",
      }),
    ).toBe("2026-08-29T00:00:00.000Z");
  });

  it("reports nothing without a cancellation", () => {
    expect(
      chargeBeforeCancellation({
        nextPaymentDate: "2026-08-29T00:00:00.000Z",
        willBeCancelledAt: null,
      }),
    ).toBeNull();
  });

  // Silence beats a fabricated charge date if either field is ever malformed.
  it("reports nothing on an unparseable date", () => {
    expect(
      chargeBeforeCancellation({
        nextPaymentDate: "",
        willBeCancelledAt: "2026-12-29T00:00:00.000Z",
      }),
    ).toBeNull();
  });
});
