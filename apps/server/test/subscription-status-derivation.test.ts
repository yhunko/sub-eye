import { describe, expect, it } from "bun:test";
import {
  deriveSubscriptionStatus,
  getSubscriptionLifecycleStatus,
  subscriptionStatuses,
} from "@subeye/shared";

const now = new Date("2026-07-20T12:00:00.000Z");
const future = "2026-09-01T00:00:00.000Z";
const past = "2026-01-01T00:00:00.000Z";

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
