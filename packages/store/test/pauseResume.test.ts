import { describe, expect, it } from "bun:test";
import { pauseSubscription, resumeSubscription } from "../src";
import { NOW, subscriptionRecord } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

const portsFor = (record = subscriptionRecord()) =>
  inMemoryPorts({ now: NOW, subscriptions: [record] });

describe("pauseSubscription", () => {
  it("stores status=paused, a pausedAt of now, and the requested resumeAt", async () => {
    const ports = portsFor();

    const dto = await pauseSubscription(
      ports,
      "sub_1",
      "2026-10-01T00:00:00.000Z",
    );

    const stored = ports.dump().subscriptions[0];
    expect(stored?.status).toBe("paused");
    expect(stored?.resumeAt).toBe("2026-10-01T00:00:00.000Z");
    expect(stored?.pausedAt).toBe(NOW.toISOString());
    expect(dto.status).toBe("paused");
  });

  it("allows an indefinite pause with no resumeAt", async () => {
    const ports = portsFor();

    await pauseSubscription(ports, "sub_1", null);

    expect(ports.dump().subscriptions[0]?.resumeAt).toBeNull();
  });

  it("refuses to pause a subscription that is already paused", async () => {
    const ports = portsFor(
      subscriptionRecord({
        status: "paused",
        pausedAt: "2026-06-01T00:00:00.000Z",
      }),
    );

    await expect(pauseSubscription(ports, "sub_1", null)).rejects.toThrow(
      "Subscription is already paused",
    );
  });

  it("pauses again once a dated pause has lapsed on its own", async () => {
    // Nothing rewrites the column when `resumeAt` simply elapses, so the guard
    // has to read the derived status — the same one the DTO and the allowed
    // actions are built from — or the row is stuck unpausable forever.
    const ports = portsFor(
      subscriptionRecord({
        status: "paused",
        pausedAt: "2026-06-01T00:00:00.000Z",
        resumeAt: "2026-07-01T00:00:00.000Z",
      }),
    );

    await pauseSubscription(ports, "sub_1", null);

    expect(ports.dump().subscriptions[0]?.status).toBe("paused");
    expect(ports.dump().subscriptions[0]?.pausedAt).toBe(NOW.toISOString());
  });
});

describe("resumeSubscription", () => {
  it("clears the pause and rolls paymentDate forward to the next FUTURE occurrence", async () => {
    const ports = portsFor(
      subscriptionRecord({
        status: "paused",
        pausedAt: "2026-02-01T00:00:00.000Z",
        resumeAt: "2026-09-23T00:00:00.000Z",
      }),
    );

    await resumeSubscription(ports, "sub_1");

    const stored = ports.dump().subscriptions[0];
    expect(stored?.status).toBe("active");
    expect(stored?.pausedAt).toBeNull();
    expect(stored?.resumeAt).toBeNull();

    // The anchor was 2026-01-05, long past. Resuming must move it forward or
    // the very next dashboard read shows an overdue charge that never happened.
    expect(Date.parse(stored?.paymentDate ?? "")).toBeGreaterThan(
      NOW.getTime(),
    );
  });

  it("refuses to resume a subscription that is not paused", async () => {
    const ports = portsFor();

    await expect(resumeSubscription(ports, "sub_1")).rejects.toThrow(
      "Subscription is not paused",
    );
  });

  it("refuses to resume once the dated pause has lapsed on its own", async () => {
    // The stale column still says `paused`, but the row reads `active`
    // everywhere the user can see it and `getAllowedActions` never offers
    // resume for it — accepting the call would roll the anchor of a
    // subscription that is billing normally.
    const ports = portsFor(
      subscriptionRecord({
        status: "paused",
        pausedAt: "2026-06-01T00:00:00.000Z",
        resumeAt: "2026-07-01T00:00:00.000Z",
      }),
    );

    await expect(resumeSubscription(ports, "sub_1")).rejects.toThrow(
      "Subscription is not paused",
    );
  });
});
