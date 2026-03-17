import { db } from "../../db";
import { ComparatorRepository } from "../comparator/comparatorRepository";
import {
  getComparatorAiLimit,
  getComparatorQuotaWindow,
  toComparatorAiQuotaDto,
  type QuotaWindow,
} from "../comparator/comparatorQuotaUtils";
import { UserService } from "../user/userService";
import type { ComparatorAiQuotaDto, PlanId } from "shared";

type AiUsageServiceDeps = {
  comparatorRepository: typeof ComparatorRepository;
  userService: typeof UserService;
};

type AiUsageContext = {
  planId: PlanId;
  quotaWindow: QuotaWindow;
  used: number;
  limit: number;
};

const defaultDeps: AiUsageServiceDeps = {
  comparatorRepository: ComparatorRepository,
  userService: UserService,
};

export class AiUsageService {
  static async getContext(
    userId: string,
    deps: AiUsageServiceDeps = defaultDeps,
  ): Promise<AiUsageContext> {
    const [planId, preferences] = await Promise.all([
      deps.userService.getPlanId(userId),
      deps.userService.getUserPreferences(userId),
    ]);

    const quotaWindow = getComparatorQuotaWindow(preferences.preferredTimezone);
    const usage = await deps.comparatorRepository.findAiUsageByUserAndPeriod(
      db,
      {
        userId,
        periodKey: quotaWindow.periodKey,
      },
    );

    return {
      planId,
      quotaWindow,
      used: usage?.analysesCount ?? 0,
      limit: getComparatorAiLimit(planId),
    };
  }

  static toQuotaDto(context: AiUsageContext): ComparatorAiQuotaDto {
    return toComparatorAiQuotaDto(
      context.planId,
      context.used,
      context.quotaWindow,
    );
  }

  static async consume(
    userId: string,
    context: AiUsageContext,
    deps: AiUsageServiceDeps = defaultDeps,
  ): Promise<AiUsageContext | null> {
    const consumed = await deps.comparatorRepository.consumeAiMonthlyQuota(db, {
      userId,
      periodKey: context.quotaWindow.periodKey,
      limit: context.limit,
    });

    if (consumed) {
      return {
        ...context,
        used: consumed.analysesCount,
      };
    }

    const latestUsage =
      await deps.comparatorRepository.findAiUsageByUserAndPeriod(db, {
        userId,
        periodKey: context.quotaWindow.periodKey,
      });

    return latestUsage
      ? {
          ...context,
          used: latestUsage.analysesCount,
        }
      : null;
  }
}
