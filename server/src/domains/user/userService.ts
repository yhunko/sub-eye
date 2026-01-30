import { CurrencyUtils } from "@shared/utils/currencyUtils";
import type { UserPreferences } from "@shared/types";

export class UserService {
  static async getUserPreferences(_userId: string): Promise<UserPreferences> {
    return {
      preferredCurrency: CurrencyUtils.normalizeCode("usd"),
      preferredTimezone: "UTC",
      notificationTime: "10:00",
      notificationOffset: 0,
      locale: "en",
    };
  }
}
