import { describe, expect, it } from "bun:test";
import { shouldAskForReview } from "./review";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 1);

const settled = { firstSeenAt: NOW - 30 * DAY, askedAt: 0 };

describe("shouldAskForReview", () => {
  it("says nothing on a fresh install", () => {
    // firstSeenAt is written by the first run and read by every later one, so
    // zero means "this IS the first run" — never "installed at the epoch".
    expect(
      shouldAskForReview(
        { firstSeenAt: 0, askedAt: 0 },
        { now: NOW, tracked: 50 },
      ),
    ).toBe(false);
  });

  it("waits out the first week however much is tracked", () => {
    expect(
      shouldAskForReview(
        { firstSeenAt: NOW - 6 * DAY, askedAt: 0 },
        { now: NOW, tracked: 20 },
      ),
    ).toBe(false);
  });

  it("waits for the app to be worth rating", () => {
    // Two subscriptions is someone trying it out. Asking them to rate it is
    // asking about a decision they have not made.
    expect(shouldAskForReview(settled, { now: NOW, tracked: 2 })).toBe(false);
    expect(shouldAskForReview(settled, { now: NOW, tracked: 3 })).toBe(true);
  });

  it("does not ask twice in a release cycle", () => {
    // The whole point of the cooldown: without it every shipped version is
    // another prompt, and iOS only allows three a year.
    expect(
      shouldAskForReview(
        { firstSeenAt: NOW - 400 * DAY, askedAt: NOW - 30 * DAY },
        { now: NOW, tracked: 20 },
      ),
    ).toBe(false);
  });

  it("asks again once the cooldown has run out", () => {
    expect(
      shouldAskForReview(
        { firstSeenAt: NOW - 400 * DAY, askedAt: NOW - 181 * DAY },
        { now: NOW, tracked: 20 },
      ),
    ).toBe(true);
  });
});
