import { describe, expect, it } from "bun:test";
import { getSubscription, listSubscriptions } from "../src";
import { NOW, phaseRecord, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

// A phase whose boundary passed an hour ago and has never been applied.
const duePhase = phaseRecord({
  id: "phase_due",
  cost: "20.00",
  startsAt: "2026-08-23T23:00:00.000Z",
});

const portsFor = () =>
  inMemoryPorts({
    now: NOW,
    subscriptions: [subscriptionRecord({ cost: "15.00" })],
    phases: [duePhase],
  });

// The invariant is not "a read must not mutate" — it is that the LIST read must
// not settle due phases and the SINGLE read must. A boundary fires the next
// time the user opens THAT subscription; both halves have to be pinned, or a
// `listSubscriptions` that returned nothing would satisfy the first one.
describe("phases settle on the single read, never on the list", () => {
  it("leaves a due pending phase untouched when listing", async () => {
    const ports = portsFor();
    const before = JSON.stringify(ports.dump());

    const listed = await listSubscriptions(ports);

    expect(listed).toHaveLength(1);
    expect(JSON.stringify(ports.dump())).toBe(before);
  });

  it("settles the same due phase when reading that one subscription", async () => {
    const ports = portsFor();

    await getSubscription(ports, "sub_1");

    const { phases, subscriptions } = ports.dump();
    expect(phases[0]?.appliedAt).toBe(NOW.toISOString());
    expect(subscriptions[0]?.cost).toBe("20.00");
  });
});
