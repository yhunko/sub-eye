import { describe, expect, it } from "bun:test";
import { isOccurrencePaused } from "../src/pause";

// Paused 2026-01-10, resuming 2026-03-15.
const window = {
  pausedAt: "2026-01-10T00:00:00.000Z",
  resumeAt: "2026-03-15T00:00:00.000Z",
};

describe("isOccurrencePaused", () => {
  const cases: Array<{
    name: string;
    window: typeof window | Record<string, null>;
    at: string;
    expected: boolean;
  }> = [
    {
      name: "before the pause began — charged",
      window,
      at: "2026-01-05T00:00:00.000Z",
      expected: false,
    },
    {
      name: "exactly at paused_at — skipped (the window is inclusive at the start)",
      window,
      at: "2026-01-10T00:00:00.000Z",
      expected: true,
    },
    {
      name: "January occurrence inside the pause — skipped",
      window,
      at: "2026-01-20T00:00:00.000Z",
      expected: true,
    },
    {
      name: "February occurrence inside the pause — skipped",
      window,
      at: "2026-02-20T00:00:00.000Z",
      expected: true,
    },
    {
      name: "March occurrence before resume_at — still skipped",
      window,
      at: "2026-03-14T23:59:59.000Z",
      expected: true,
    },
    {
      name: "exactly at resume_at — CHARGED (the window is exclusive at the end)",
      window,
      at: "2026-03-15T00:00:00.000Z",
      expected: false,
    },
    {
      name: "after resume_at — charged",
      window,
      at: "2026-04-15T00:00:00.000Z",
      expected: false,
    },
    {
      name: "indefinite pause: no resume_at, occurrence after paused_at — skipped",
      window: { pausedAt: "2026-01-10T00:00:00.000Z", resumeAt: null },
      at: "2029-01-01T00:00:00.000Z",
      expected: true,
    },
    {
      name: "never paused — charged",
      window: { pausedAt: null, resumeAt: null },
      at: "2026-02-20T00:00:00.000Z",
      expected: false,
    },
    {
      name: "resume_at set but paused_at missing — treated as never paused",
      window: { pausedAt: null, resumeAt: "2026-03-15T00:00:00.000Z" },
      at: "2026-02-20T00:00:00.000Z",
      expected: false,
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      expect(
        isOccurrencePaused(testCase.window as never, new Date(testCase.at)),
      ).toBe(testCase.expected);
    });
  }
});
