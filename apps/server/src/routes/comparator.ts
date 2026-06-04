import { vValidator } from "@hono/valibot-validator";
import type {
  AnalyzeComparatorInput,
  AnalyzeComparatorResponseDto,
  ComparatorAiQuotaDto,
  ComparatorQuotaDto,
  ComparatorRatesDto,
  CompareSubscriptionsInput,
  CompareSubscriptionsResponseDto,
} from "@subeye/shared";
import {
  AnalyzeComparatorInputSchema,
  CompareSubscriptionsInputSchema,
} from "@subeye/shared";
import type { Context, MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { ComparatorAiService } from "../domains/comparator/comparatorAiService";
import { ComparatorService } from "../domains/comparator/comparatorService";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";
import { handleServiceError } from "../utils/routeUtils";

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

export const createComparatorRouter = (deps: ComparatorRouterDeps = {}) => {
  const service = deps.service ?? {
    getQuota: (userId: string) => ComparatorService.getQuota(userId),
    getRates: (userId: string) => ComparatorService.getRates(userId),
    compare: (userId: string, payload: CompareSubscriptionsInput) =>
      ComparatorService.compare(userId, payload),
    getAiQuota: (userId: string) => ComparatorAiService.getAiQuota(userId),
    analyze: (userId: string, payload: AnalyzeComparatorInput) =>
      ComparatorAiService.analyze(userId, payload),
  };
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
