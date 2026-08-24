import { describe, expect, it } from "bun:test";
import { pauseSubscription } from "../src";
import { NOW, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

const portsFor = (record = subscriptionRecord()) =>
  inMemoryPorts({ now: NOW, subscriptions: [record] });

// Pause used to write the literal `"paused"`. It now derives, like the other
// three lifecycle writes, so the column agrees with the status the DTO and
// `allowedActions` are built from. These are the inputs where the two answers
// differ — both reachable through the API, neither offered by the UI.
describe("pauseSubscription derives the status column", () => {
  it("stores `cancelling` when the pause lands on a cancelling subscription", async () => {
    const ports = portsFor(
      subscriptionRecord({
        status: "cancelling",
        willBeCancelledAt: "2026-09-23T00:00:00.000Z",
      }),
    );

    await pauseSubscription(ports, "sub_1", null);

    // The cancellation outranks the pause everywhere else, so a column reading
    // `paused` here would hide the row from `?status=cancelling`.
    expect(ports.dump().subscriptions[0]?.status).toBe("cancelling");
  });

  it("stores `active` when the requested resume day has already arrived", async () => {
    // `resumeAt` is validated as an ISO date, not a FUTURE one, so today is a
    // legal request — and a pause that ends today is over before it started.
    const ports = portsFor();

    await pauseSubscription(ports, "sub_1", NOW.toISOString());

    expect(ports.dump().subscriptions[0]?.status).toBe("active");
  });

  it("never touches the cancellation date", async () => {
    const ports = portsFor(
      subscriptionRecord({
        status: "cancelling",
        willBeCancelledAt: "2026-09-23T00:00:00.000Z",
      }),
    );

    await pauseSubscription(ports, "sub_1", null);

    // Written back as null, the pause would silently un-cancel the
    // subscription, and nothing else in the suite would notice.
    expect(ports.dump().subscriptions[0]?.willBeCancelledAt).toBe(
      "2026-09-23T00:00:00.000Z",
    );
  });
});
