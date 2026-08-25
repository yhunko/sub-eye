import { describe, expect, it } from "bun:test";
import { cancelPhase, startPhase } from "../src";
import { NOW, phaseRecord, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

const portsFor = (phases = [] as ReturnType<typeof phaseRecord>[]) =>
  inMemoryPorts({
    now: NOW,
    subscriptions: [subscriptionRecord({ cost: "15.00" })],
    phases,
  });

describe("startPhase", () => {
  // A price of ZERO is a free stretch, and the only difference it makes is the
  // kind stored against it — the form that produced this asked one question.
  it("records a zero price as a trial phase, and starts it now", async () => {
    const ports = portsFor();

    await startPhase(ports, "sub_1", {
      kind: "temporaryPrice",
      promoCost: 0,
      startMode: "now",
      payments: 1,
      standardCost: 12,
    });

    const { subscriptions, phases } = ports.dump();

    expect(subscriptions[0]?.cost).toBe("0.00");
    expect(subscriptions[0]?.currency).toBe("usd");

    expect(phases.map((phase) => phase.kind)).toEqual(["trial", "standard"]);
    expect(phases[0]?.cost).toBe("0.00");
    expect(phases[0]?.appliedAt).toBe(NOW.toISOString());
    expect(phases[1]?.cost).toBe("12.00");
    // One charge at zero, reverting on the next.
    expect(phases[0]?.endsAt).toBe("2026-10-05T00:00:00.000Z");
    expect(phases[1]?.startsAt).toBe("2026-10-05T00:00:00.000Z");
    expect(phases[1]?.appliedAt).toBeNull();
  });

  it("records a price above zero as an intro phase", async () => {
    const ports = portsFor();

    await startPhase(ports, "sub_1", {
      kind: "temporaryPrice",
      promoCost: 5,
      startMode: "now",
      payments: 3,
      standardCost: 12,
    });

    expect(ports.dump().phases.map((phase) => phase.kind)).toEqual([
      "intro",
      "standard",
    ]);
  });

  // The whole point of counting charges instead of asking for a date. The
  // anchor is the 5th and `now` is 24 Aug, so the discounted charges are 5 Sep,
  // 5 Oct and 5 Nov — and the revert has to land on 5 Dec, the FIRST charge at
  // the standard price again. A boundary of 5 Nov would silently buy two
  // discounted payments instead of three.
  it("closes an intro window on the charge after the last discounted one", async () => {
    const ports = portsFor();

    await startPhase(ports, "sub_1", {
      kind: "temporaryPrice",
      promoCost: 5,
      startMode: "nextPayment",
      payments: 3,
      standardCost: 12,
    });

    const { phases } = ports.dump();

    expect(phases[0]?.startsAt).toBe("2026-09-05T00:00:00.000Z");
    expect(phases[0]?.endsAt).toBe("2026-12-05T00:00:00.000Z");
    expect(phases[1]?.startsAt).toBe("2026-12-05T00:00:00.000Z");
  });

  // A promo taken mid-cycle does not discount the period already paid for.
  // Writing the promo onto the row here is what made the app report a discount
  // a month before it existed.
  it("leaves today's price alone when the intro starts at the next payment", async () => {
    const ports = portsFor();

    await startPhase(ports, "sub_1", {
      kind: "temporaryPrice",
      promoCost: 5,
      startMode: "nextPayment",
      payments: 3,
      standardCost: 12,
    });

    const { subscriptions, phases } = ports.dump();

    expect(subscriptions[0]?.cost).toBe("15.00");
    // Unapplied, so the ordinary due-phase machinery flips the row when the
    // charge actually arrives.
    expect(phases[0]?.appliedAt).toBeNull();
  });

  it("moves the price immediately when the intro starts now", async () => {
    const ports = portsFor();

    await startPhase(ports, "sub_1", {
      kind: "temporaryPrice",
      promoCost: 5,
      startMode: "now",
      payments: 1,
      standardCost: 12,
    });

    const { subscriptions, phases } = ports.dump();

    expect(subscriptions[0]?.cost).toBe("5.00");
    expect(phases[0]?.appliedAt).toBe(NOW.toISOString());
    // One discounted charge (5 Sep), reverting at the next one.
    expect(phases[0]?.endsAt).toBe("2026-10-05T00:00:00.000Z");
  });

  it("replaces an existing schedule rather than appending to it", async () => {
    const ports = portsFor([phaseRecord({ id: "phase_old" })]);

    await startPhase(ports, "sub_1", {
      kind: "temporaryPrice",
      promoCost: 0,
      startMode: "now",
      payments: 1,
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
