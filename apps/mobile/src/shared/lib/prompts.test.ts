import { describe, expect, it } from "bun:test";
import { nextPrompt } from "./prompts";

const quiet = {
  tracked: 5,
  isPro: false,
  proPitched: true,
  reviewDue: false,
  interrupted: false,
  remindersPending: false,
};

describe("nextPrompt", () => {
  it("says nothing when every gate is closed", () => {
    expect(nextPrompt(quiet)).toBeNull();
  });

  it("says nothing at all once something has already interrupted", () => {
    // The whole reason this takes `interrupted`: the reminders sheet fires from
    // the SAVE path, and without this the Pro pitch would follow it onto Home
    // seconds later. Both are individually reasonable and together a mugging.
    expect(
      nextPrompt({
        ...quiet,
        proPitched: false,
        reviewDue: true,
        interrupted: true,
      }),
    ).toBeNull();
  });

  it("never returns two things at once", () => {
    expect(nextPrompt({ ...quiet, proPitched: false, reviewDue: true })).toBe(
      "pro",
    );
  });

  it("waits for a third subscription before pitching Pro", () => {
    expect(nextPrompt({ ...quiet, proPitched: false, tracked: 2 })).toBeNull();
    expect(nextPrompt({ ...quiet, proPitched: false, tracked: 3 })).toBe("pro");
  });

  it("pitches Pro once, ever", () => {
    expect(nextPrompt({ ...quiet, proPitched: true })).toBeNull();
  });

  it("never pitches Pro to someone who already bought it", () => {
    expect(nextPrompt({ ...quiet, proPitched: false, isPro: true })).toBeNull();
  });

  it("falls through to the rating sheet once the pitch is spent", () => {
    expect(nextPrompt({ ...quiet, reviewDue: true })).toBe("review");
  });

  it("stays quiet while the reminders offer is still owed", () => {
    // The bug this exists to stop: Home is the launch tab, so its timer starts
    // before the user has done anything. Left to fire, the pitch took the
    // session's one interruption a second and a half in, and the reminders
    // offer — which fires from the save path — found it spent every single
    // time. `taken=true due=true`, save after save, and the offer never showed.
    expect(
      nextPrompt({
        ...quiet,
        proPitched: false,
        reviewDue: true,
        remindersPending: true,
      }),
    ).toBeNull();
  });
});
