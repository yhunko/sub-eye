import { describe, expect, it } from "bun:test";
import { cancelPhase, startPhase } from "../src";
import { NOW, phaseRecord, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

const ENDS_AT = "2026-10-23T00:00:00.000Z";

const portsFor = (phases = [] as ReturnType<typeof phaseRecord>[]) =>
  inMemoryPorts({
    now: NOW,
    subscriptions: [subscriptionRecord({ cost: "15.00" })],
    phases,
  });

describe("startPhase", () => {
  it("routes kind=trial to the trial schedule: sets the price now and lays down two phases", async () => {
    const ports = portsFor();

    await startPhase(ports, "sub_1", {
      kind: "trial",
      promoCost: 0,
      endsAt: ENDS_AT,
      standardCost: 12,
    });

    const { subscriptions, phases } = ports.dump();

    // The row's own cost is what the user pays right now, so it moves to the
    // trial price immediately.
    expect(subscriptions[0]?.cost).toBe("0.00");
    expect(subscriptions[0]?.currency).toBe("usd");

    // Two phases: the trial (applied now) + the standard revert.
    expect(phases.map((phase) => phase.kind)).toEqual(["trial", "standard"]);
    expect(phases[0]?.cost).toBe("0.00");
    expect(phases[0]?.appliedAt).toBe(NOW.toISOString());
    expect(phases[0]?.endsAt).toBe(ENDS_AT);
    expect(phases[1]?.cost).toBe("12.00");
    expect(phases[1]?.startsAt).toBe(ENDS_AT);
    expect(phases[1]?.appliedAt).toBeNull();
  });

  it("routes kind=intro to the intro schedule", async () => {
    const ports = portsFor();

    await startPhase(ports, "sub_1", {
      kind: "intro",
      promoCost: 5,
      endsAt: ENDS_AT,
      standardCost: 12,
    });

    expect(ports.dump().phases.map((phase) => phase.kind)).toEqual([
      "intro",
      "standard",
    ]);
  });

  it("replaces an existing schedule rather than appending to it", async () => {
    const ports = portsFor([phaseRecord({ id: "phase_old" })]);

    await startPhase(ports, "sub_1", {
      kind: "trial",
      promoCost: 0,
      endsAt: ENDS_AT,
      standardCost: 12,
    });

    expect(ports.dump().phases.some((phase) => phase.id === "phase_old")).toBe(
      false,
    );
  });

  it("routes kind=scheduledChange to a single future phase", async () => {
    const ports = portsFor();

    await startPhase(ports, "sub_1", {
      kind: "scheduledChange",
      cost: 20,
      mode: "nextOccurrence",
    });

    const { phases } = ports.dump();
    expect(phases).toHaveLength(1);
    expect(phases[0]?.kind).toBe("scheduledChange");
    expect(phases[0]?.cost).toBe("20.00");
    expect(phases[0]?.appliedAt).toBeNull();
  });

  it("keeps the applied history when scheduling a change", async () => {
    // A scheduled change supersedes what is PENDING. The trial the user
    // already lived through is history, and dropping it changes the price the
    // timeline says they were on.
    const ports = portsFor([
      phaseRecord({
        id: "phase_trial",
        kind: "trial",
        cost: "0.00",
        startsAt: "2026-08-01T00:00:00.000Z",
        appliedAt: "2026-08-01T00:00:00.000Z",
      }),
      phaseRecord({ id: "phase_pending" }),
    ]);

    await startPhase(ports, "sub_1", {
      kind: "scheduledChange",
      cost: 20,
      mode: "nextOccurrence",
    });

    const ids = ports.dump().phases.map((phase) => phase.id);
    expect(ids).toContain("phase_trial");
    expect(ids).not.toContain("phase_pending");
  });
});

describe("cancelPhase", () => {
  it("removes a pending phase and leaves the rest alone", async () => {
    const ports = portsFor([
      phaseRecord({ id: "phase_pending" }),
      phaseRecord({
        id: "phase_applied",
        startsAt: "2026-08-01T00:00:00.000Z",
        appliedAt: "2026-08-01T00:00:00.000Z",
      }),
    ]);

    await cancelPhase(ports, "sub_1", "phase_pending");

    expect(ports.dump().phases.map((phase) => phase.id)).toEqual([
      "phase_applied",
    ]);
  });

  it("refuses to cancel a phase that has already fired", async () => {
    const ports = portsFor([
      phaseRecord({ id: "phase_applied", appliedAt: NOW.toISOString() }),
    ]);

    await expect(cancelPhase(ports, "sub_1", "phase_applied")).rejects.toThrow(
      "Price phase has already been applied",
    );
  });

  it("refuses a phase id that belongs to another subscription", async () => {
    const ports = portsFor([
      phaseRecord({ id: "phase_other", subscriptionId: "sub_2" }),
    ]);

    await expect(cancelPhase(ports, "sub_1", "phase_other")).rejects.toThrow(
      "Price phase not found",
    );
  });
});
