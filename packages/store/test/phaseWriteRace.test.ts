import { describe, expect, it } from "bun:test";
import { applyDuePhases, type Ports, schedulePriceChange } from "../src";
import { NOW, phaseRecord, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

/**
 * Lands `other` in the window between a use-case deciding what a subscription's
 * phases should be and that decision reaching the store — the interleave two
 * concurrent writers produce, staged so it happens on every run rather than on
 * a scheduler's whim.
 */
const withWriterLandingFirst = (
  ports: Ports,
  other: () => Promise<void>,
): Ports => ({
  ...ports,
  phases: {
    ...ports.phases,
    replaceAll: async (id, records) => {
      await other();
      await ports.phases.replaceAll(id, records);
    },
    replacePending: async (id, records) => {
      await other();
      await ports.phases.replacePending(id, records);
    },
  },
});

// The real pair: DuePhaseSync settles a due boundary on foreground while the
// detail screen schedules a price change on the same subscription.
describe("a boundary firing under a concurrent phase write", () => {
  it("survives a scheduled change staged before it landed", async () => {
    const ports = inMemoryPorts({
      now: NOW,
      subscriptions: [subscriptionRecord({ cost: "10.00" })],
      phases: [
        phaseRecord({
          id: "phase_due",
          cost: "20.00",
          startsAt: "2026-08-01T00:00:00.000Z",
        }),
      ],
    });

    await schedulePriceChange(
      withWriterLandingFirst(ports, () => applyDuePhases(ports, "sub_1")),
      "sub_1",
      {
        mode: "customDate",
        scheduledCost: 30,
        customDate: "2026-12-01T00:00:00.000Z",
      },
    );

    const { subscriptions, phases } = ports.dump();

    // The boundary already moved the row onto its price. Dropping the phase
    // leaves that 20.00 with nothing on the timeline to explain it — wrong
    // money that reads as correct.
    expect(subscriptions[0]?.cost).toBe("20.00");
    expect(phases.find((phase) => phase.id === "phase_due")?.appliedAt).toBe(
      NOW.toISOString(),
    );

    expect(
      phases.filter((phase) => phase.kind === "scheduledChange"),
    ).toHaveLength(1);
  });
});
