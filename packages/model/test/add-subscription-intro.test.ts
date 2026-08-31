import { describe, expect, it } from "bun:test";
import { safeParse } from "valibot";
import { addSubscriptionIntroSchema } from "../src/domains/subscription/subscriptionSchemas";

const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

describe("addSubscriptionIntroSchema", () => {
  it("accepts a free trial ending in the future", () => {
    expect(
      safeParse(addSubscriptionIntroSchema, {
        kind: "trial",
        promoCost: 0,
        endsAt: future,
      }).success,
    ).toBe(true);
  });

  it("rejects an endsAt in the past", () => {
    expect(
      safeParse(addSubscriptionIntroSchema, {
        kind: "trial",
        promoCost: 0,
        endsAt: past,
      }).success,
    ).toBe(false);
  });

  it("rejects promoCost 0 for an intro discount — that is a trial, not a discount", () => {
    expect(
      safeParse(addSubscriptionIntroSchema, {
        kind: "intro",
        promoCost: 0,
        endsAt: future,
      }).success,
    ).toBe(false);
  });

  it("accepts a positive promoCost for an intro discount", () => {
    expect(
      safeParse(addSubscriptionIntroSchema, {
        kind: "intro",
        promoCost: 4.99,
        endsAt: future,
      }).success,
    ).toBe(true);
  });
});
