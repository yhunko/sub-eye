import { describe, expect, it } from "bun:test";
import { getAllowedActions } from "@subeye/model";

describe("getAllowedActions", () => {
  const cases: Array<{
    name: string;
    input: {
      status: "active" | "paused" | "cancelling" | "cancelled";
      hasPendingPhase: boolean;
    };
    expected: string[];
  }> = [
    {
      name: "active with nothing scheduled",
      input: { status: "active", hasPendingPhase: false },
      expected: ["edit", "addPhase", "pause", "cancel", "delete"],
    },
    {
      name: "active with a pending phase gains apply-now and cancel-phase",
      input: { status: "active", hasPendingPhase: true },
      expected: [
        "edit",
        "addPhase",
        "applyPhaseNow",
        "cancelPhase",
        "pause",
        "cancel",
        "delete",
      ],
    },
    {
      name: "paused can resume and cancel but not pause again or schedule pricing",
      input: { status: "paused", hasPendingPhase: false },
      expected: ["edit", "resume", "cancel", "delete"],
    },
    {
      name: "cancelling can be un-cancelled, not paused",
      input: { status: "cancelling", hasPendingPhase: false },
      expected: ["edit", "renew", "delete"],
    },
    {
      name: "cancelled can only be renewed or deleted",
      input: { status: "cancelled", hasPendingPhase: true },
      expected: ["renew", "delete"],
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      expect(getAllowedActions(testCase.input)).toEqual(
        testCase.expected as never,
      );
    });
  }
});
