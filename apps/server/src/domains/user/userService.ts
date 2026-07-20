import type { UpdateUserPreferences, UserPreferences } from "@subeye/shared";
import { CurrencyUtils, DateFormatUtils } from "@subeye/shared";
import { UserRepository } from "./userRepository";

type UserRow = {
  preferredCurrency: string;
  timezone: string;
  dateFormat: string;
  locale: string;
  theme: string;
};

type UserServiceDeps = {
  userRepository: {
    findById: (userId: string) => Promise<UserRow | null>;
    upsert: (userId: string, values: Partial<UserRow>) => Promise<UserRow>;
  };
};

const defaultDeps: UserServiceDeps = { userRepository: UserRepository };

const DEFAULTS: UserPreferences = {
  preferredCurrency: CurrencyUtils.DEFAULT_CURRENCY_CODE,
  preferredTimezone: "UTC",
  dateFormat: DateFormatUtils.DEFAULT_FORMAT,
  locale: "en",
  theme: "system",
};

const toPreferences = (row: UserRow | null): UserPreferences =>
  row
    ? {
        preferredCurrency: CurrencyUtils.normalizeCode(row.preferredCurrency),
        preferredTimezone: row.timezone,
        dateFormat: row.dateFormat,
        locale: row.locale,
        theme: row.theme,
      }
    : { ...DEFAULTS };

export class UserService {
  /**
   * Preferences come from Postgres. Before v4 this hit Clerk on every call —
   * an external round-trip on the hottest path — and could even write back to
   * Clerk during a plain read.
   */
  static async getUserPreferences(
    userId: string,
    deps: UserServiceDeps = defaultDeps,
  ): Promise<UserPreferences> {
    return toPreferences(await deps.userRepository.findById(userId));
  }

  static async updateUserPreferences(
    userId: string,
    patch: UpdateUserPreferences,
    deps: UserServiceDeps = defaultDeps,
  ): Promise<UserPreferences> {
    const values: Partial<UserRow> = {};

    if (patch.preferredCurrency !== undefined) {
      values.preferredCurrency = CurrencyUtils.normalizeCode(
        patch.preferredCurrency,
      );
    }
    if (patch.preferredTimezone !== undefined) {
      values.timezone = patch.preferredTimezone;
    }
    if (patch.dateFormat !== undefined) values.dateFormat = patch.dateFormat;
    if (patch.locale !== undefined) values.locale = patch.locale;
    if (patch.theme !== undefined) values.theme = patch.theme;

    return toPreferences(await deps.userRepository.upsert(userId, values));
  }
}
