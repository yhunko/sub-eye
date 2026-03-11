import type { Context, MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { vValidator } from "@hono/valibot-validator";
import type {
  AnalyzeComparatorInput,
  AnalyzeComparatorResponseDto,
  ComparatorAiQuotaDto,
  ComparatorRatesDto,
  ComparatorQuotaDto,
  CompareSubscriptionsInput,
  CompareSubscriptionsResponseDto,
} from "shared";
import {
  AnalyzeComparatorInputSchema,
  CompareSubscriptionsInputSchema,
} from "shared";
import { ComparatorController } from "../domains/comparator/comparatorController";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";

type ComparatorControllerContract = {
  getQuota: (userId: string) => Promise<ComparatorQuotaDto>;
  getAiQuota: (userId: string) => Promise<ComparatorAiQuotaDto>;
  getRates: (userId: string) => Promise<ComparatorRatesDto>;
  compare: (
    userId: string,
    payload: CompareSubscriptionsInput,
  ) => Promise<CompareSubscriptionsResponseDto>;
  analyze: (
    userId: string,
    payload: AnalyzeComparatorInput,
  ) => Promise<AnalyzeComparatorResponseDto>;
};

type ComparatorRouterDeps = {
  controller?: ComparatorControllerContract;
  protectMiddleware?: MiddlewareHandler;
  getUserId?: (context: Context) => string;
};

const knownServiceErrorStatuses: Record<string, 403 | 404> = {
  "Subscription not found": 404,
  "Comparator quota exceeded": 403,
};

const handleServiceError = (context: Context, error: unknown) => {
  if (error instanceof Error) {
    const mappedStatus = knownServiceErrorStatuses[error.message];
    if (mappedStatus) {
      return context.json({ error: error.message }, mappedStatus);
    }

    return context.json(
      { error: "Comparator Error", message: error.message },
      500,
    );
  }

  return context.json({ error: "Internal Server Error" }, 500);
};

export const createComparatorRouter = (deps: ComparatorRouterDeps = {}) => {
  const controller = deps.controller ?? ComparatorController;
  const protectMiddleware = deps.protectMiddleware ?? protect;
  const getUserId = deps.getUserId ?? requireUserId;

  return new Hono()
    .get("/quota", protectMiddleware, async (context) => {
      const userId = getUserId(context);

      try {
        const data = await controller.getQuota(userId);
        return context.json(data);
      } catch (error) {
        return handleServiceError(context, error);
      }
    })
    .get("/rates", protectMiddleware, async (context) => {
      const userId = getUserId(context);

      try {
        const data = await controller.getRates(userId);
        return context.json(data);
      } catch (error) {
        return handleServiceError(context, error);
      }
    })
    .get("/ai-quota", protectMiddleware, async (context) => {
      const userId = getUserId(context);

      try {
        const data = await controller.getAiQuota(userId);
        return context.json(data);
      } catch (error) {
        return handleServiceError(context, error);
      }
    })
    .post(
      "/compare",
      protectMiddleware,
      vValidator("json", CompareSubscriptionsInputSchema),
      async (context) => {
        const userId = getUserId(context);

        try {
          const payload = context.req.valid("json");
          const data = await controller.compare(userId, payload);
          return context.json(data);
        } catch (error) {
          return handleServiceError(context, error);
        }
      },
    )
    .post(
      "/analyze",
      protectMiddleware,
      vValidator("json", AnalyzeComparatorInputSchema),
      async (context) => {
        const userId = getUserId(context);

        try {
          const payload = context.req.valid("json");
          const data = await controller.analyze(userId, payload);
          return context.json(data);
        } catch (error) {
          return handleServiceError(context, error);
        }
      },
    );
};

export const comparatorRouter = createComparatorRouter();
