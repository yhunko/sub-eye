import type {
  AnalyzeComparatorInput,
  AnalyzeComparatorResponseDto,
  ComparatorAiQuotaDto,
  ComparatorRatesDto,
  ComparatorQuotaDto,
  CompareSubscriptionsInput,
  CompareSubscriptionsResponseDto,
} from "shared";
import { ComparatorService } from "./comparatorService";

export class ComparatorController {
  static async getQuota(userId: string): Promise<ComparatorQuotaDto> {
    return ComparatorService.getQuota(userId);
  }

  static async getRates(userId: string): Promise<ComparatorRatesDto> {
    return ComparatorService.getRates(userId);
  }

  static async getAiQuota(userId: string): Promise<ComparatorAiQuotaDto> {
    return ComparatorService.getAiQuota(userId);
  }

  static async compare(
    userId: string,
    payload: CompareSubscriptionsInput,
  ): Promise<CompareSubscriptionsResponseDto> {
    return ComparatorService.compare(userId, payload);
  }

  static async analyze(
    userId: string,
    payload: AnalyzeComparatorInput,
  ): Promise<AnalyzeComparatorResponseDto> {
    return ComparatorService.analyze(userId, payload);
  }
}
