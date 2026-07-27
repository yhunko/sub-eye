import { describe, expect, it } from "bun:test";
import { passwordStrength } from "./password-strength";

describe("passwordStrength", () => {
  it("scores anything under 8 characters as unscored, not weak", () => {
    // 0 renders no filled segments and no label — a 3-character password must
    // not light up a third of the meter.
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("Aa1!")).toBe(0);
    expect(passwordStrength("Aa1!Aa1")).toBe(0);
  });

  it("scores a long-but-plain password the same as a short-but-varied one", () => {
    // Both reach "good": length and variety are interchangeable at this tier,
    // which is what stops the meter from punishing a passphrase.
    expect(passwordStrength("tramlineoats")).toBe(2);
    expect(passwordStrength("Aa1!zzzz")).toBe(2);
  });

  it("requires BOTH length and variety for strong", () => {
    expect(passwordStrength("tramline-9-oats")).toBe(3);
    // 12+ chars but only two character classes — long alone is not strong.
    expect(passwordStrength("tramlineoats1")).toBe(2);
  });

  it("scores the bare minimum as weak", () => {
    expect(passwordStrength("aaaaaaaa")).toBe(1);
  });
});
