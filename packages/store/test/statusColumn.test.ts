import { describe, expect, it } from "bun:test";
import { cancelSubscription, renewSubscription } from "../src";
import { NOW, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

const portsFor = (record = subscriptionRecord()) =>
  inMemoryPorts({ now: NOW, subscriptions: [record] });

// deriveSubscriptionStatus is what the lifecycle writes go through. The column
// is the only thing a SQL-side `?status=` filter can see, so a mutation that
// skips it makes a cancelled subscription match `?status=active` and never
// match `?status=cancelled`.
describe("the lifecycle writes agree with deriveSubscriptionStatus", () => {
  it("cancelling at period end stores `cancelling`", async () => {
    const ports = portsFor();

    await cancelSubscription(ports, "sub_1", "periodEnd");

    expect(ports.dump().subscriptions[0]?.status).toBe("cancelling");
  });

  it("cancelling immediately stores `cancelled`", async () => {
    const ports = portsFor();

    await cancelSubscription(ports, "sub_1", "immediate");

    expect(ports.dump().subscriptions[0]?.status).toBe("cancelled");
  });

  it("cancelling a paused subscription stores the cancellation, not the pause", async () => {
    const ports = portsFor(
      subscriptionRecord({
        status: "paused",
        pausedAt: "2026-06-01T00:00:00.000Z",
      }),
    );

    await cancelSubscription(ports, "sub_1", "periodEnd");

    expect(ports.dump().subscriptions[0]?.status).toBe("cancelling");
  });

  it("renewing stores `active`", async () => {
    const ports = portsFor(
      subscriptionRecord({
        status: "cancelled",
        willBeCancelledAt: "2026-03-27T00:00:00.000Z",
      }),
    );

    await renewSubscription(ports, "sub_1", null);

    expect(ports.dump().subscriptions[0]?.status).toBe("active");
  });
});
