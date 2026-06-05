import { clerkClient } from "@clerk/express";
import type {
  PlanId,
  UpdateUserPublicMetadata,
  UserPreferences,
} from "@subeye/shared";
import {
  CurrencyUtils,
  DEFAULT_EXPIRY_NOTIFICATION_INTERVALS,
  DEFAULT_EXPIRY_NOTIFICATIONS_ENABLED,
  hasPlanFeature,
  NOTIFICATION_SCHEDULE_DEFAULTS,
  resolvePlanId,
} from "@subeye/shared";

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
      normalized.notificationTime = UserService.DEFAULT_TIME;
      normalized.notificationOffset = UserService.DEFAULT_OFFSET;
    }

    if (!hasPlanFeature(planId, "expiryNotifications")) {
      normalized.expiryNotificationsEnabled =
        DEFAULT_EXPIRY_NOTIFICATIONS_ENABLED;
      normalized.expiryNotificationIntervals = [
        ...DEFAULT_EXPIRY_NOTIFICATION_INTERVALS,
      ];
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
    const hasTimeDefault =
      metadata.notificationTime === UserService.DEFAULT_TIME;
    const hasOffsetDefault =
      metadata.notificationOffset === UserService.DEFAULT_OFFSET;

    if (!hasTimeDefault) {
      patch.notificationTime = UserService.DEFAULT_TIME;
    }

    if (!hasOffsetDefault) {
      patch.notificationOffset = UserService.DEFAULT_OFFSET;
    }

    return Object.keys(patch).length > 0 ? patch : null;
  }

  private static async getPlanScopedMetadata(
    userId: string,
  ): Promise<{ metadata: Record<string, unknown>; planId: PlanId }> {
    const user = await clerkClient.users.getUser(userId);
    const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
    const planId = UserService.getPlanIdFromMetadata(metadata);
    const patch = UserService.getNotificationScheduleNormalizationPatch(
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
    const normalizedMetadata = UserService.normalizeMetadataByPlan(
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
          : UserService.DEFAULT_TIME,
      notificationOffset:
        typeof normalizedMetadata.notificationOffset === "number"
          ? normalizedMetadata.notificationOffset
          : UserService.DEFAULT_OFFSET,
      expiryNotificationsEnabled:
        typeof normalizedMetadata.expiryNotificationsEnabled === "boolean"
          ? normalizedMetadata.expiryNotificationsEnabled
          : DEFAULT_EXPIRY_NOTIFICATIONS_ENABLED,
      expiryNotificationIntervals:
        Array.isArray(normalizedMetadata.expiryNotificationIntervals) &&
        normalizedMetadata.expiryNotificationIntervals.every(
          (interval) => typeof interval === "number",
        )
          ? normalizedMetadata.expiryNotificationIntervals
          : [...DEFAULT_EXPIRY_NOTIFICATION_INTERVALS],
      locale:
        typeof normalizedMetadata.locale === "string"
          ? normalizedMetadata.locale
          : "en",
    };
  }

  static async getPlanId(userId: string): Promise<PlanId> {
    try {
      const { planId } = await UserService.getPlanScopedMetadata(userId);
      return planId;
    } catch (error) {
      console.error(`Failed to get plan for ${userId}:`, error);
      return "free";
    }
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const { metadata, planId } =
        await UserService.getPlanScopedMetadata(userId);
      return UserService.parseUserPreferences(metadata, planId);
    } catch (error) {
      // Fallback to defaults if user not found or other error
      console.error(`Failed to get user preferences for ${userId}:`, error);
      return UserService.parseUserPreferences(null);
    }
  }

  static async setPlanId(userId: string, planId: PlanId): Promise<void> {
    const user = await clerkClient.users.getUser(userId);
    const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
    const currentPlanId = UserService.getPlanIdFromMetadata(metadata);

    if (currentPlanId === planId) {
      return;
    }

    const updatedMetadata = UserService.normalizeMetadataByPlan(
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
      await UserService.getPlanScopedMetadata(userId);
    const updatedMetadata = UserService.normalizeMetadataByPlan(
      { ...currentMetadata, ...metadata },
      planId,
    );

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: updatedMetadata,
    });

    return UserService.parseUserPreferences(updatedMetadata, planId);
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
