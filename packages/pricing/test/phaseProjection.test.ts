import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/shared";
import { buildPhaseProjection } from "../src/phaseProjection";

const recurrence = { every: 1, period: SubscriptionPeriod.MONTH };
const now = new Date("2026-06-15T00:00:00.000Z");

describe("buildPhaseProjection", () => {
  // Proves the two things the DTO consumer actually reads: which override the
  // user is inside right now (drives the "Trial" badge) and what replaces it
  // (drives the "reverts to $12 on 30 Jun" line). Both derive from the same
  // sorted phase list, so they can never disagree.
  it("reports the active override kind and the upcoming reversion", () => {
    const projection = buildPhaseProjection(
      recurrence,
      [
        {
          id: "std",
          kind: "standard",
          cost: "12.00",
          currency: "usd",
          startsAt: "2026-06-30T00:00:00.000Z",
          endsAt: null,
        },
        {
          id: "trial",
          kind: "trial",
          cost: "0.00",
          currency: "usd",
          startsAt: "2026-06-01T00:00:00.000Z",
          endsAt: "2026-06-30T00:00:00.000Z",
        },
      ],
      "usd",
      {},
      now,
    );

    expect(projection.effectivePhaseKind).toBe("trial");
    expect(projection.upcomingPhase?.id).toBe("std");
    expect(projection.scheduledPriceChange).toEqual({
      cost: 12,
      currency: "usd",
      effectiveAt: "2026-06-30T00:00:00.000Z",
      billing: projection.upcomingPhase!.billing,
    });
  });

  // Proves the sort: phases are returned oldest-first regardless of input order,
  // which is what lets the detail screen render the timeline by iterating.
  it("returns phases sorted by start date", () => {
    const projection = buildPhaseProjection(
      recurrence,
      [
        {
          id: "b",
          kind: "standard",
          cost: "12.00",
          currency: "usd",
          startsAt: "2026-06-30T00:00:00.000Z",
          endsAt: null,
        },
        {
          id: "a",
          kind: "trial",
          cost: "0.00",
          currency: "usd",
          startsAt: "2026-06-01T00:00:00.000Z",
          endsAt: "2026-06-30T00:00:00.000Z",
        },
      ],
      "usd",
      {},
      now,
    );

    expect(projection.pricePhases.map((phase) => phase.id)).toEqual(["a", "b"]);
    expect(projection.pricePhases[0]?.isActive).toBe(true);
    expect(projection.pricePhases[1]?.isActive).toBe(false);
  });

  // Proves the default: with no trial or intro window open, the effective kind
  // is "standard" — NOT null, NOT the kind of the most recent phase row. A
  // `scheduledChange` sitting in the future must not colour the current state.
  it("falls back to standard when no override window is open", () => {
    const projection = buildPhaseProjection(
      recurrence,
      [
        {
          id: "sc",
          kind: "scheduledChange",
          cost: "18.00",
          currency: "usd",
          startsAt: "2026-07-01T00:00:00.000Z",
          endsAt: null,
        },
      ],
      "usd",
      {},
      now,
    );

    expect(projection.effectivePhaseKind).toBe("standard");
    expect(projection.upcomingPhase?.id).toBe("sc");
  });

  // Proves the empty case does not crash and reports nothing scheduled.
  it("reports standard with nothing scheduled for an empty phase list", () => {
    const projection = buildPhaseProjection(recurrence, [], "usd", {}, now);

    expect(projection.pricePhases).toEqual([]);
    expect(projection.effectivePhaseKind).toBe("standard");
    expect(projection.upcomingPhase).toBeNull();
    expect(projection.scheduledPriceChange).toBeNull();
  });
});
