import { describe, expect, it } from "bun:test";
import { applyPhaseNow } from "../src";
import { NOW, phaseRecord, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

const TRIAL_ENDS_AT = "2026-09-23T00:00:00.000Z";

// The user is mid-trial: the trial phase is active until TRIAL_ENDS_AT, and the
// standard phase is pending, due to start exactly when the trial ends.
const trial = phaseRecord({
  id: "phase_trial",
  kind: "trial",
  cost: "0.00",
  startsAt: "2026-08-19T00:00:00.000Z",
  endsAt: TRIAL_ENDS_AT,
  appliedAt: "2026-08-19T00:00:00.000Z",
});

const standard = phaseRecord({
  id: "phase_standard",
  kind: "standard",
  cost: "12.00",
  startsAt: TRIAL_ENDS_AT,
});

describe("applyPhaseNow", () => {
  it("closes the trial at the apply moment and moves the standard phase start to now", async () => {
    const ports = inMemoryPorts({
      now: NOW,
      subscriptions: [subscriptionRecord({ cost: "0.00" })],
      phases: [trial, standard],
    });

    await applyPhaseNow(ports, "sub_1", "phase_standard");

    const { phases, subscriptions } = ports.dump();
    const applied = phases.find((phase) => phase.id === "phase_standard");
    const closed = phases.find((phase) => phase.id === "phase_trial");

    expect(applied?.appliedAt).toBe(NOW.toISOString());

    // The applied phase must start NOW, not a month from now — otherwise
    // getUpcomingPhase keeps reporting it and scheduledPriceChange stays set.
    expect(applied?.startsAt).toBe(NOW.toISOString());
    expect(Date.parse(applied?.startsAt ?? "")).toBeLessThan(
      Date.parse(TRIAL_ENDS_AT),
    );

    // The trial must be closed at the same moment — otherwise
    // getEffectivePhase keeps returning the trial and effectivePhaseKind lies.
    expect(closed?.endsAt).toBe(NOW.toISOString());

    // And the price the user pays has to move with the boundary.
    expect(subscriptions[0]?.cost).toBe("12.00");
  });

  it("refuses a phase that has already been applied", async () => {
    const ports = inMemoryPorts({
      now: NOW,
      subscriptions: [subscriptionRecord()],
      phases: [trial],
    });

    await expect(applyPhaseNow(ports, "sub_1", "phase_trial")).rejects.toThrow(
      "Price phase has already been applied",
    );
  });
});
