import { describe, expect, it } from "bun:test";
import { parsePaddleTransactionId } from "../src/entities/billing/lib/parse-paddle-transaction-id";

describe("parsePaddleTransactionId", () => {
  it("accepts valid Paddle transaction ids", () => {
    expect(parsePaddleTransactionId("txn_01gp3z8cfkqgdq07hcr3ja0q95")).toBe(
      "txn_01gp3z8cfkqgdq07hcr3ja0q95",
    );
  });

  it("rejects missing or malformed values", () => {
    expect(parsePaddleTransactionId(undefined)).toBeNull();
    expect(parsePaddleTransactionId("")).toBeNull();
    expect(
      parsePaddleTransactionId("txn-01gp3z8cfkqgdq07hcr3ja0q95"),
    ).toBeNull();
    expect(
      parsePaddleTransactionId("ctm_01gp3z8cfkqgdq07hcr3ja0q95"),
    ).toBeNull();
  });
});
