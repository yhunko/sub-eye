import { CurrencyUtils } from "shared";
import { hasPlanFeature } from "shared";
import { NOTIFICATION_SCHEDULE_DEFAULTS } from "shared";
import { resolvePlanId } from "shared";
import type { PlanId } from "shared";
import type { UserPreferences } from "shared";
import type { UpdateUserPublicMetadata } from "shared";
import { clerkClient } from "@clerk/express";

export class UserService {
  private static readonly DEFAULT_TIME =
    NOTIFICATION_SCHEDULE_DEFAULTS.notificationTime;
  private static readonly DEFAULT_OFFSET =
    NOTIFICATION_SCHEDULE_DEFAULTS.notificationOffset;

  static getPlanIdFromMetadata(
    metadata?: Record<string, unknown> | null,
  ): PlanId {
    return resolvePlanId(metadata?.planId);
  }

  private static normalizeMetadataByPlan(
    metadata: Record<string, unknown>,
    planId: PlanId,
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...metadata };

    if (!hasPlanFeature(planId, "notificationSchedule")) {
      normalized.notificationTime = this.DEFAULT_TIME;
      normalized.notificationOffset = this.DEFAULT_OFFSET;
    }

    return normalized;
  }

  private static getNotificationScheduleNormalizationPatch(
    metadata: Record<string, unknown>,
    planId: PlanId,
  ): Partial<Record<string, unknown>> | null {
    if (hasPlanFeature(planId, "notificationSchedule")) {
      return null;
    }

    const patch: Partial<Record<string, unknown>> = {};
    const hasTimeDefault = metadata.notificationTime === this.DEFAULT_TIME;
    const hasOffsetDefault =
      metadata.notificationOffset === this.DEFAULT_OFFSET;

    if (!hasTimeDefault) {
      patch.notificationTime = this.DEFAULT_TIME;
    }

    if (!hasOffsetDefault) {
      patch.notificationOffset = this.DEFAULT_OFFSET;
    }

    return Object.keys(patch).length > 0 ? patch : null;
  }

  private static async getPlanScopedMetadata(
    userId: string,
  ): Promise<{ metadata: Record<string, unknown>; planId: PlanId }> {
    const user = await clerkClient.users.getUser(userId);
    const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
    const planId = this.getPlanIdFromMetadata(metadata);
    const patch = this.getNotificationScheduleNormalizationPatch(
      metadata,
      planId,
    );

    if (!patch) {
      return { metadata, planId };
    }

    const normalizedMetadata = { ...metadata, ...patch };
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: normalizedMetadata,
    });

    return { metadata: normalizedMetadata, planId };
  }

  /**
   * Parses UserPublicMetadata from Clerk and converts it to UserPreferences with defaults
   * @param metadata UserPublicMetadata from Clerk (may be partial or undefined)
   * @param planId
   * @returns Complete UserPreferences with defaults for missing values
   */
  private static parseUserPreferences(
    metadata?: Record<string, unknown> | null,
    planId: PlanId = "free",
  ): UserPreferences {
    const normalizedMetadata = this.normalizeMetadataByPlan(
      metadata ?? {},
      planId,
    );

    return {
      preferredCurrency: (() => {
        const value = normalizedMetadata.preferredCurrency;
        return typeof value === "string"
          ? CurrencyUtils.normalizeCode(value)
          : CurrencyUtils.normalizeCode(CurrencyUtils.DEFAULT_CURRENCY_CODE);
      })(),
      preferredTimezone:
        typeof normalizedMetadata.preferredTimezone === "string"
          ? normalizedMetadata.preferredTimezone
          : "UTC",
      notificationTime:
        typeof normalizedMetadata.notificationTime === "string"
          ? normalizedMetadata.notificationTime
          : this.DEFAULT_TIME,
      notificationOffset:
        typeof normalizedMetadata.notificationOffset === "number"
          ? normalizedMetadata.notificationOffset
          : this.DEFAULT_OFFSET,
      locale:
        typeof normalizedMetadata.locale === "string"
          ? normalizedMetadata.locale
          : "en",
    };
  }

  static async getPlanId(userId: string): Promise<PlanId> {
    try {
      const { planId } = await this.getPlanScopedMetadata(userId);
      return planId;
    } catch (error) {
      console.error(`Failed to get plan for ${userId}:`, error);
      return "free";
    }
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const { metadata, planId } = await this.getPlanScopedMetadata(userId);
      return this.parseUserPreferences(metadata, planId);
    } catch (error) {
      // Fallback to defaults if user not found or other error
      console.error(`Failed to get user preferences for ${userId}:`, error);
      return this.parseUserPreferences(null);
    }
  }

  static async setPlanId(userId: string, planId: PlanId): Promise<void> {
    const user = await clerkClient.users.getUser(userId);
    const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
    const currentPlanId = this.getPlanIdFromMetadata(metadata);

    if (currentPlanId === planId) {
      return;
    }

    const updatedMetadata = this.normalizeMetadataByPlan(
      { ...metadata, planId },
      planId,
    );

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: updatedMetadata,
    });
  }

  static async updateUserPublicMetadata(
    userId: string,
    metadata: UpdateUserPublicMetadata,
  ): Promise<UserPreferences> {
    const { metadata: currentMetadata, planId } =
      await this.getPlanScopedMetadata(userId);
    const updatedMetadata = this.normalizeMetadataByPlan(
      { ...currentMetadata, ...metadata },
      planId,
    );

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: updatedMetadata,
    });

    return this.parseUserPreferences(updatedMetadata, planId);
  }

  static async updateLocale(userId: string, locale: string): Promise<void> {
    const user = await clerkClient.users.getUser(userId);
    const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
    const updatedMetadata = { ...metadata, locale };

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: updatedMetadata,
    });
  }
}
