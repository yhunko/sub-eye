import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "shared";
import {
  createDefaultManualPlanDraft,
  parseManualPlanDraft,
} from "./comparator-form";

describe("parseManualPlanDraft", () => {
  it("returns parsed payload for valid manual input", () => {
    const parsed = parseManualPlanDraft({
      ...createDefaultManualPlanDraft(),
      name: "Apple Music",
      amountInput: "9.99",
      currency: "USD",
      everyInput: "1",
      period: SubscriptionPeriod.MONTH,
    });

    expect(parsed.error).toBeNull();
    expect(parsed.payload).toMatchObject({
      source: "manual",
      name: "Apple Music",
      amount: 9.99,
      currency: "usd",
      every: 1,
      period: SubscriptionPeriod.MONTH,
    });
  });

  it("returns invalid_amount when price is invalid", () => {
    const parsed = parseManualPlanDraft({
      ...createDefaultManualPlanDraft(),
      amountInput: "abc",
    });

    expect(parsed.error).toBe("invalid_amount");
    expect(parsed.payload).toBeNull();
  });

  it("returns invalid_every when every is below 1", () => {
    const parsed = parseManualPlanDraft({
      ...createDefaultManualPlanDraft(),
      amountInput: "10",
      everyInput: "0",
    });

    expect(parsed.error).toBe("invalid_every");
    expect(parsed.payload).toBeNull();
  });
});
