import { describe, expect, it } from "bun:test";
import { cancelSubscription } from "../src";
import { NOW, phaseRecord, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

describe("cancelSubscription", () => {
  it("keeps the pending standard-reversion phase so renew restores the real price", async () => {
    const ports = inMemoryPorts({
      now: NOW,
      // Currently paying the trial price.
      subscriptions: [subscriptionRecord({ cost: "0.00" })],
      phases: [phaseRecord({ id: "phase_standard", cost: "12.00" })],
    });

    await cancelSubscription(ports, "sub_1", "periodEnd");

    // Cancelling is not a reason to throw away the price the sub reverts to.
    // Without the phase, un-cancelling strands the user on the trial price
    // permanently.
    expect(ports.dump().phases).toHaveLength(1);
    expect(ports.dump().phases[0]?.appliedAt).toBeNull();
    expect(ports.dump().subscriptions[0]?.status).toBe("cancelling");
  });
});
