import { clerkClient } from "@clerk/nextjs/server";
import { CurrencyUtils } from "@/shared/lib/currency.utils";
import { UserPreferences } from "../model/user.types";

export class UserService {
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = user.publicMetadata ?? {};

    const preferredCurrency = CurrencyUtils.normalizeCode(
      metadata.preferredCurrency ?? "usd",
    );
    const preferredTimezone =
      typeof metadata.preferredTimezone === "string"
        ? metadata.preferredTimezone
        : "UTC";
    const notificationTime =
      typeof metadata.notificationTime === "string"
        ? metadata.notificationTime
        : "10:00";
    const notificationOffset =
      typeof metadata.notificationOffset === "number" &&
      Number.isFinite(metadata.notificationOffset)
        ? metadata.notificationOffset
        : -1;
    const locale = typeof metadata.locale === "string" ? metadata.locale : "en";

    return {
      preferredCurrency,
      preferredTimezone,
      notificationTime,
      notificationOffset,
      locale,
    };
  }
}
