import { CurrencyUtils } from "shared";
import type { UserPreferences } from "shared";
import type { UpdateUserPublicMetadata } from "shared";
import { clerkClient } from "@clerk/express";

export class UserService {
  /**
   * Parses UserPublicMetadata from Clerk and converts it to UserPreferences with defaults
   * @param metadata UserPublicMetadata from Clerk (may be partial or undefined)
   * @returns Complete UserPreferences with defaults for missing values
   */
  private static parseUserPreferences(
    metadata?: Record<string, unknown> | null,
  ): UserPreferences {
    return {
      preferredCurrency:
        metadata?.preferredCurrency &&
        typeof metadata.preferredCurrency === "string"
          ? CurrencyUtils.normalizeCode(metadata.preferredCurrency)
          : CurrencyUtils.normalizeCode(CurrencyUtils.DEFAULT_CURRENCY_CODE),
      preferredTimezone:
        metadata?.preferredTimezone &&
        typeof metadata.preferredTimezone === "string"
          ? metadata.preferredTimezone
          : "UTC",
      notificationTime:
        metadata?.notificationTime &&
        typeof metadata.notificationTime === "string"
          ? metadata.notificationTime
          : "10:00",
      notificationOffset:
        metadata?.notificationOffset &&
        typeof metadata.notificationOffset === "number"
          ? metadata.notificationOffset
          : 0,
      locale:
        metadata?.locale && typeof metadata.locale === "string"
          ? metadata.locale
          : "en",
    };
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const user = await clerkClient.users.getUser(userId);
      return this.parseUserPreferences(user.publicMetadata);
    } catch (error) {
      // Fallback to defaults if user not found or other error
      console.error(`Failed to get user preferences for ${userId}:`, error);
      return this.parseUserPreferences(null);
    }
  }

  static async updateUserPublicMetadata(
    userId: string,
    metadata: UpdateUserPublicMetadata,
  ): Promise<UserPreferences> {
    const user = await clerkClient.users.getUser(userId);

    const currentMetadata = user.publicMetadata ?? {};
    const updatedMetadata = { ...currentMetadata, ...metadata };

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: updatedMetadata,
    });

    return this.parseUserPreferences(updatedMetadata);
  }
}
