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
import { ComparatorService } from "../domains/comparator/comparatorService";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";

type ComparatorServiceContract = {
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
  service?: ComparatorServiceContract;
  protectMiddleware?: MiddlewareHandler;
  getUserId?: (context: Context) => string;
};

const handleServiceError = (context: Context, error: unknown) => {
  if (error instanceof Error && "status" in error) {
    return context.json(
      { error: error.message },
      error.status as 400 | 403 | 404,
    );
  }
  return context.json({ error: "Internal Server Error" }, 500);
};

export const createComparatorRouter = (deps: ComparatorRouterDeps = {}) => {
  const service = deps.service ?? ComparatorService;
  const protectMiddleware = deps.protectMiddleware ?? protect;
  const getUserId = deps.getUserId ?? requireUserId;

  return new Hono()
    .get("/quota", protectMiddleware, async (context) => {
      const userId = getUserId(context);

      try {
        const data = await service.getQuota(userId);
        return context.json(data);
      } catch (error) {
        return handleServiceError(context, error);
      }
    })
    .get("/rates", protectMiddleware, async (context) => {
      const userId = getUserId(context);

      try {
        const data = await service.getRates(userId);
        return context.json(data);
      } catch (error) {
        return handleServiceError(context, error);
      }
    })
    .get("/ai-quota", protectMiddleware, async (context) => {
      const userId = getUserId(context);

      try {
        const data = await service.getAiQuota(userId);
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
          const data = await service.compare(userId, payload);
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
          const data = await service.analyze(userId, payload);
          return context.json(data);
        } catch (error) {
          return handleServiceError(context, error);
        }
      },
    );
};

export const comparatorRouter = createComparatorRouter();
