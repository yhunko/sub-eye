import { describe, expect, it } from "bun:test";
import { maskEmail } from "./mask-email";

describe("maskEmail", () => {
  it("keeps the first and last character of the local part", () => {
    expect(maskEmail("yhunko@gmail.com")).toBe("y****o@gmail.com");
  });

  it("never leaves a short local part unmasked", () => {
    // A two-character local part has no middle to star out; printing "ab@…"
    // verbatim would defeat the point of masking at all.
    expect(maskEmail("ab@x.com")).toBe("a*@x.com");
    expect(maskEmail("a@x.com")).toBe("a*@x.com");
  });

  it("splits on the LAST @, so a quoted local part keeps its domain", () => {
    expect(maskEmail("a@b@example.com")).toBe("a*b@example.com");
  });

  it("returns anything that is not an address untouched", () => {
    // The screen renders whatever Clerk has on the resource; a username-only
    // sign-up reaches here with no address at all.
    expect(maskEmail("")).toBe("");
    expect(maskEmail("yhunko")).toBe("yhunko");
    expect(maskEmail("@nolocal.com")).toBe("@nolocal.com");
  });
});
