import { describe, expect, it } from "bun:test";
import {
  AlreadyPausedError,
  NotPausedError,
  PhaseAlreadyAppliedError,
  SubscriptionNotFoundError,
} from "@subeye/store";
import { handleServiceError, onInvalid } from "../src/utils/routeUtils";

const fakeContext = () => {
  const captured: { body: unknown; status: number } = { body: null, status: 0 };
  return {
    captured,
    context: {
      env: {},
      // extractRequestContext reads ctx.get + ctx.req.{method,url,routePath,header}.
      get: () => undefined,
      req: {
        path: "/api/subscriptions/x",
        url: "http://localhost/api/subscriptions/x",
        routePath: "/api/subscriptions/:id",
        method: "GET",
        header: () => undefined,
      },
      json: (body: unknown, status: number) => {
        captured.body = body;
        captured.status = status;
        return new Response(JSON.stringify(body), { status });
      },
    },
  };
};

describe("handleServiceError", () => {
  const cases: Array<{ error: Error; code: string; status: number }> = [
    {
      error: new SubscriptionNotFoundError(),
      code: "SUBSCRIPTION_NOT_FOUND",
      status: 404,
    },
    {
      error: new PhaseAlreadyAppliedError(),
      code: "PHASE_ALREADY_APPLIED",
      status: 400,
    },
    {
      error: new AlreadyPausedError(),
      code: "SUBSCRIPTION_ALREADY_PAUSED",
      status: 400,
    },
    {
      error: new NotPausedError(),
      code: "SUBSCRIPTION_NOT_PAUSED",
      status: 400,
    },
  ];

  for (const testCase of cases) {
    it(`maps ${testCase.error.name} to ${testCase.code}`, () => {
      const { captured, context } = fakeContext();
      handleServiceError(context as never, testCase.error);

      expect(captured.status).toBe(testCase.status);
      expect(captured.body).toEqual({
        success: false,
        error: { code: testCase.code, message: testCase.error.message },
      });
    });
  }

  it("falls back to INTERNAL_ERROR for an unrecognised throw", () => {
    const { captured, context } = fakeContext();
    handleServiceError(context as never, new Error("boom"));

    expect(captured.status).toBe(500);
    expect(captured.body).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal Server Error" },
    });
  });
});

describe("onInvalid", () => {
  it("answers a rejected payload in the same envelope as every other error", () => {
    const { captured, context } = fakeContext();

    onInvalid(
      { success: false, issues: [{ message: "Date cannot be in the future" }] },
      context as never,
    );

    // Without the hook this is valibot's own result object — an `issues` array
    // and no `error` key — which reaches the client as a codeless failure.
    expect(captured.status).toBe(400);
    expect(captured.body).toEqual({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Date cannot be in the future",
      },
    });
  });

  it("lets a valid payload through", () => {
    const { captured, context } = fakeContext();

    expect(onInvalid({ success: true }, context as never)).toBeUndefined();
    expect(captured.status).toBe(0);
  });
});
