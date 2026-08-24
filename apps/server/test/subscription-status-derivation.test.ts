import { describe, expect, it } from "bun:test";
import {
  deriveSubscriptionStatus,
  getSubscriptionLifecycleStatus,
  subscriptionStatuses,
} from "@subeye/model";

const now = new Date("2026-07-20T12:00:00.000Z");
const future = "2026-09-01T00:00:00.000Z";
const past = "2026-01-01T00:00:00.000Z";

describe("deriveSubscriptionStatus — day boundaries", () => {
  // The transition belongs to the user's calendar day, not to UTC's. In Kyiv
  // (UTC+3) it is already the 1st when UTC still says 31 August at 22:00, so a
  // cancellation dated the 1st has taken effect for that user.
  it("uses the account's calendar day east of UTC", () => {
    const lateOnTheThirtyFirst = new Date("2026-08-31T22:00:00.000Z");
    const input = { willBeCancelledAt: "2026-09-01T00:00:00.000Z" };

    expect(deriveSubscriptionStatus(input, lateOnTheThirtyFirst)).toBe(
      "cancelling",
    );
    expect(
      deriveSubscriptionStatus(input, lateOnTheThirtyFirst, "Europe/Kyiv"),
    ).toBe("cancelled");
  });

  // The direction that actually hurt: at 20:00 on 31 August in New York, UTC has
  // already rolled over, so a raw instant comparison reported a subscription as
  // ended on an evening the user still had access.
  it("keeps a subscription alive through the user's evening west of UTC", () => {
    const eveningOfTheThirtyFirst = new Date("2026-09-01T00:30:00.000Z");
    const input = { willBeCancelledAt: "2026-09-01T00:00:00.000Z" };

    expect(deriveSubscriptionStatus(input, eveningOfTheThirtyFirst)).toBe(
      "cancelled",
    );
    expect(
      deriveSubscriptionStatus(
        input,
        eveningOfTheThirtyFirst,
        "America/New_York",
      ),
    ).toBe("cancelling");
  });

  // `pausedAt` is an INSTANT — the moment the user tapped pause — and must NOT
  // be floored to its day. Floored, a pause taken at 14:00 would read as
  // effective since midnight and `isOccurrencePaused` would drop a charge that
  // was really taken that morning.
  it("treats pausedAt as an instant, so a pause takes effect the moment it is set", () => {
    const justAfter = new Date("2026-08-31T14:00:01.000Z");

    expect(
      deriveSubscriptionStatus(
        { pausedAt: "2026-08-31T14:00:00.000Z", resumeAt: null },
        justAfter,
        "Europe/Kyiv",
      ),
    ).toBe("paused");
  });

  // ...while `resumeAt` IS a day: the pause lapses when that day arrives for
  // the user, not at its UTC midnight.
  it("lapses a pause when the resume day arrives in the account's zone", () => {
    const input = {
      pausedAt: "2026-08-01T10:00:00.000Z",
      resumeAt: "2026-09-01T00:00:00.000Z",
    };

    expect(
      deriveSubscriptionStatus(
        input,
        new Date("2026-08-31T22:00:00.000Z"),
        "Europe/Kyiv",
      ),
    ).toBe("active");
    expect(
      deriveSubscriptionStatus(
        input,
        new Date("2026-09-01T00:30:00.000Z"),
        "America/New_York",
      ),
    ).toBe("paused");
  });
});

describe("deriveSubscriptionStatus", () => {
  it("exposes exactly the four v4 status values in enum order", () => {
    expect([...subscriptionStatuses]).toEqual([
      "active",
      "paused",
      "cancelling",
      "cancelled",
    ]);
  });

  it("reproduces the old derived lifecycle status for every un-paused case", () => {
    const cases = [
      { willBeCancelledAt: null, expectedOld: "active", expectedNew: "active" },
      {
        willBeCancelledAt: future,
        expectedOld: "cancelledButActive",
        expectedNew: "cancelling",
      },
      {
        willBeCancelledAt: past,
        expectedOld: "cancelled",
        expectedNew: "cancelled",
      },
    ] as const;

    for (const testCase of cases) {
      expect(
        getSubscriptionLifecycleStatus(
          { willBeCancelledAt: testCase.willBeCancelledAt },
          now,
        ),
      ).toBe(testCase.expectedOld);
      expect(
        deriveSubscriptionStatus(
          { willBeCancelledAt: testCase.willBeCancelledAt },
          now,
        ),
      ).toBe(testCase.expectedNew);
    }
  });

  it("reports paused when paused_at has passed and resume_at is still ahead", () => {
    expect(
      deriveSubscriptionStatus({ pausedAt: past, resumeAt: future }, now),
    ).toBe("paused");
  });

  it("reports paused for an open-ended pause with no resume date", () => {
    expect(
      deriveSubscriptionStatus({ pausedAt: past, resumeAt: null }, now),
    ).toBe("paused");
  });

  it("reports active once resume_at has passed, so a forgotten pause self-heals", () => {
    expect(
      deriveSubscriptionStatus({ pausedAt: past, resumeAt: past }, now),
    ).toBe("active");
  });

  it("ignores a pause scheduled to start in the future", () => {
    expect(deriveSubscriptionStatus({ pausedAt: future }, now)).toBe("active");
  });

  it("lets cancellation outrank pause", () => {
    expect(
      deriveSubscriptionStatus(
        { willBeCancelledAt: future, pausedAt: past, resumeAt: future },
        now,
      ),
    ).toBe("cancelling");
    expect(
      deriveSubscriptionStatus(
        { willBeCancelledAt: past, pausedAt: past, resumeAt: future },
        now,
      ),
    ).toBe("cancelled");
  });

  it("ignores unparseable dates instead of throwing", () => {
    expect(
      deriveSubscriptionStatus({ willBeCancelledAt: "not-a-date" }, now),
    ).toBe("active");
  });
});
