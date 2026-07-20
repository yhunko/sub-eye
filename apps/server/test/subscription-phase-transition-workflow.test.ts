import { describe, expect, it } from "bun:test";
import { SubscriptionPhaseTransitionWorkflow } from "../src/domains/subscription/subscriptionPhaseTransitionWorkflow";

describe("SubscriptionPhaseTransitionWorkflow.isAuthoritativePhaseRun", () => {
  it("is authoritative when the run id matches and the phase is pending", () => {
    expect(
      SubscriptionPhaseTransitionWorkflow.isAuthoritativePhaseRun(
        { qstashMessageId: "run_1", appliedAt: null },
        "run_1",
      ),
    ).toBe(true);
  });

  it("is not authoritative for a stale run id (reschedule race)", () => {
    expect(
      SubscriptionPhaseTransitionWorkflow.isAuthoritativePhaseRun(
        { qstashMessageId: "run_1", appliedAt: null },
        "run_2",
      ),
    ).toBe(false);
  });

  it("is not authoritative once the phase has already been applied", () => {
    expect(
      SubscriptionPhaseTransitionWorkflow.isAuthoritativePhaseRun(
        { qstashMessageId: "run_1", appliedAt: "2026-06-15T00:00:00.000Z" },
        "run_1",
      ),
    ).toBe(false);
  });

  it("is not authoritative for a missing phase", () => {
    expect(
      SubscriptionPhaseTransitionWorkflow.isAuthoritativePhaseRun(
        null,
        "run_1",
      ),
    ).toBe(false);
  });
});
