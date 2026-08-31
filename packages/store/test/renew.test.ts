import { describe, expect, it } from "bun:test";
import { renewSubscription } from "../src";
import { NOW, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

// Ended: the state that gets asked for a restart date.
const ended = subscriptionRecord({
  name: "Bolt+",
  status: "cancelled",
  willBeCancelledAt: "2026-03-27T00:00:00.000Z",
});

const portsFor = (record = ended) =>
  inMemoryPorts({ now: NOW, subscriptions: [record] });

describe("renewSubscription", () => {
  it("clears the cancellation", async () => {
    const ports = portsFor();

    const dto = await renewSubscription(ports, "sub_1", null);

    expect(ports.dump().subscriptions[0]?.willBeCancelledAt).toBeNull();
    expect(dto.willBeCancelledAt).toBeNull();
  });

  it("re-anchors the billing cycle to the given restart date", async () => {
    const ports = portsFor();

    await renewSubscription(ports, "sub_1", "2026-07-20T00:00:00.000Z");

    // The anchor is what every future occurrence is projected from. Left on the
    // old January date, a subscription restarted in July keeps billing on the
    // 5th — the day of a cycle the user is no longer on.
    expect(ports.dump().subscriptions[0]?.paymentDate).toBe(
      "2026-07-20T00:00:00.000Z",
    );
  });

  it("leaves the anchor alone when no date is given", async () => {
    const ports = portsFor();

    await renewSubscription(ports, "sub_1", null);

    // A `cancelling` subscription never stopped billing, so it is renewed
    // without a date — writing one here would shift a cycle that was never
    // interrupted, and writing null would strand it with no anchor at all.
    expect(ports.dump().subscriptions[0]?.paymentDate).toBe(
      "2026-01-05T00:00:00.000Z",
    );
  });

  it("clears the pause as well as the cancellation", async () => {
    // Reachable in two taps: a `paused` subscription is offered `cancel`, and a
    // cancelled one is offered `renew`.
    const ports = portsFor(
      subscriptionRecord({
        ...ended,
        status: "paused",
        pausedAt: "2026-06-01T00:00:00.000Z",
        resumeAt: null,
      }),
    );

    const dto = await renewSubscription(
      ports,
      "sub_1",
      "2026-07-20T00:00:00.000Z",
    );

    // Left set, `pausedAt` with no `resumeAt` puts the restarted subscription
    // straight back into an INDEFINITE pause: isOccurrencePaused then drops
    // every future occurrence, so it contributes nothing to the burn rate, the
    // forecast or the reminders while the badge reads Paused.
    const stored = ports.dump().subscriptions[0];
    expect(stored?.pausedAt).toBeNull();
    expect(stored?.resumeAt).toBeNull();
    expect(stored?.status).toBe("active");
    expect(dto.status).toBe("active");
  });
});
