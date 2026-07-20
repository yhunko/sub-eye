import { describe, expect, it } from "bun:test";
import {
  getEffectivePhase,
  getUpcomingPhase,
  selectDuePhases,
} from "../src/phaseSelection";

const now = new Date("2026-06-15T00:00:00.000Z");

describe("getEffectivePhase / getUpcomingPhase", () => {
  it("returns the active trial and the upcoming standard phase", () => {
    const phases = [
      {
        id: "trial",
        startsAt: "2026-06-01T00:00:00.000Z",
        endsAt: "2026-06-30T00:00:00.000Z",
      },
      { id: "standard", startsAt: "2026-06-30T00:00:00.000Z", endsAt: null },
    ];

    expect(getEffectivePhase(phases, now)?.id).toBe("trial");
    expect(getUpcomingPhase(phases, now)?.id).toBe("standard");
  });

  it("returns no effective phase but an upcoming scheduled change", () => {
    const phases = [
      { id: "sc", startsAt: "2026-07-01T00:00:00.000Z", endsAt: null },
    ];

    expect(getEffectivePhase(phases, now)).toBeNull();
    expect(getUpcomingPhase(phases, now)?.id).toBe("sc");
  });

  it("treats an applied open-ended phase as effective with nothing upcoming", () => {
    const phases = [
      {
        id: "trial",
        startsAt: "2026-05-01T00:00:00.000Z",
        endsAt: "2026-06-01T00:00:00.000Z",
      },
      { id: "standard", startsAt: "2026-06-01T00:00:00.000Z", endsAt: null },
    ];

    expect(getEffectivePhase(phases, now)?.id).toBe("standard");
    expect(getUpcomingPhase(phases, now)).toBeNull();
  });

  it("excludes a phase whose window has fully passed", () => {
    const phases = [
      {
        id: "old",
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-02-01T00:00:00.000Z",
      },
    ];

    expect(getEffectivePhase(phases, now)).toBeNull();
    expect(getUpcomingPhase(phases, now)).toBeNull();
  });

  it("at the exact boundary, the next phase is effective (no overlap)", () => {
    const phases = [
      {
        id: "a",
        startsAt: "2026-06-01T00:00:00.000Z",
        endsAt: "2026-06-15T00:00:00.000Z",
      },
      { id: "b", startsAt: "2026-06-15T00:00:00.000Z", endsAt: null },
    ];

    expect(getEffectivePhase(phases, now)?.id).toBe("b");
    expect(getUpcomingPhase(phases, now)).toBeNull();
  });
});

describe("selectDuePhases", () => {
  const nowMs = Date.parse("2026-06-15T00:00:00.000Z");

  // Proves the "due" definition: not yet applied AND its boundary has arrived.
  // A phase with appliedAt set has already had its price copied onto the
  // subscription row; re-applying it would double-charge the timeline.
  it("returns only unapplied phases whose boundary has passed", () => {
    const due = selectDuePhases(
      [
        {
          id: "past-applied",
          startsAt: "2026-05-01T00:00:00.000Z",
          appliedAt: "2026-05-01T00:00:00.000Z",
        },
        {
          id: "past-pending",
          startsAt: "2026-06-01T00:00:00.000Z",
          appliedAt: null,
        },
        {
          id: "future-pending",
          startsAt: "2026-07-01T00:00:00.000Z",
          appliedAt: null,
        },
      ],
      nowMs,
    );

    expect(due.map((phase) => phase.id)).toEqual(["past-pending"]);
  });

  // Proves the ordering guarantee. Phases must be applied oldest-first, because
  // each apply overwrites the subscription's cost — applying them out of order
  // leaves the row holding a price from the middle of the timeline.
  it("sorts due phases oldest boundary first", () => {
    const due = selectDuePhases(
      [
        { id: "b", startsAt: "2026-06-10T00:00:00.000Z", appliedAt: null },
        { id: "a", startsAt: "2026-06-01T00:00:00.000Z", appliedAt: null },
      ],
      nowMs,
    );

    expect(due.map((phase) => phase.id)).toEqual(["a", "b"]);
  });

  // A boundary exactly at "now" has arrived. `<=`, not `<`.
  it("treats a boundary exactly at now as due", () => {
    const due = selectDuePhases(
      [{ id: "exact", startsAt: "2026-06-15T00:00:00.000Z", appliedAt: null }],
      nowMs,
    );

    expect(due).toHaveLength(1);
  });
});
