import { describe, expect, it } from "bun:test";
import { clerkErrorCode, clerkErrorText } from "./clerk-error";

describe("clerkErrorCode", () => {
  it("reads the first error's code", () => {
    expect(
      clerkErrorCode({ errors: [{ code: "form_password_incorrect" }] }),
    ).toBe("form_password_incorrect");
  });

  it("returns null for anything that is not a Clerk API error", () => {
    // Every one of these reaches the catch block of a real sign-in attempt: a
    // network failure, an SDK-internal throw, a rejection with no value. The
    // screen is already showing a failure — it must not crash reading it.
    expect(clerkErrorCode(new Error("Network request failed"))).toBeNull();
    expect(clerkErrorCode(undefined)).toBeNull();
    expect(clerkErrorCode(null)).toBeNull();
    expect(clerkErrorCode({ errors: [] })).toBeNull();
    expect(clerkErrorCode({ errors: "nope" })).toBeNull();
    expect(clerkErrorCode({ errors: [null] })).toBeNull();
  });
});

describe("clerkErrorText", () => {
  it("prefers longMessage — it is the actionable half of the pair", () => {
    expect(
      clerkErrorText({
        errors: [
          {
            code: "form_password_length_too_short",
            message: "is too short",
            longMessage: "Password must be 8 characters or more.",
          },
        ],
      }),
    ).toBe("Password must be 8 characters or more.");
  });

  it("falls back to message when there is no longMessage", () => {
    expect(clerkErrorText({ errors: [{ message: "is too short" }] })).toBe(
      "is too short",
    );
  });

  it("returns null when there is nothing to show", () => {
    expect(clerkErrorText(new Error("boom"))).toBeNull();
  });
});
