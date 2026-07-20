import { describe, expect, it } from "bun:test";
import { getEffectivePhase, getUpcomingPhase } from "@subeye/shared";

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
