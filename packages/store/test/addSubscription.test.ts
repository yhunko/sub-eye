import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import { addSubscription } from "../src";
import { NOW } from "./fixtures";
import { inMemoryPorts } from "./inMemoryPorts";

const payload = {
  name: "Netflix",
  cost: 12,
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  paymentDate: "2026-09-01T00:00:00.000Z",
  autoPaid: false,
  categoryId: null,
  notes: null,
  brandDomain: null,
  willBeCancelledAt: null,
};

describe("addSubscription", () => {
  it("rejects an intro ending later today WITHOUT creating the subscription row", async () => {
    const ports = inMemoryPorts({ now: NOW });

    const attempt = addSubscription(ports, {
      ...payload,
      // 23:00 on today's UTC day: strictly in the future, so the old pre-flight
      // accepted it — but it floors to 00:00 today, which is in the past.
      intro: {
        kind: "trial",
        promoCost: 0,
        endsAt: "2026-08-24T23:00:00.000Z",
      },
    });

    await expect(attempt).rejects.toThrow(
      "Scheduled effective date must be in the future",
    );

    // The whole point of the bug: the row must not exist afterwards. There is
    // nothing to roll back on a host without transactions, so validation has to
    // come first.
    expect(ports.dump().subscriptions).toEqual([]);
  });

  it("writes the row and the offer timeline when the intro is valid", async () => {
    const ports = inMemoryPorts({ now: NOW });

    await addSubscription(ports, {
      ...payload,
      intro: {
        kind: "trial",
        promoCost: 0,
        endsAt: "2026-09-24T00:00:00.000Z",
      },
    });

    const { subscriptions, phases } = ports.dump();
    // The trial price is what the user pays now; the standard price it reverts
    // to lives on the pending phase, not on the row.
    expect(subscriptions[0]?.cost).toBe("0.00");
    expect(phases.map((phase) => phase.kind)).toEqual(["trial", "standard"]);
    expect(phases[1]?.cost).toBe("12.00");
  });
});
