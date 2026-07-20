import { describe, expect, it } from "bun:test";
import { UserService } from "../src/domains/user/userService";

type Row = {
  id: string;
  preferredCurrency: string;
  timezone: string;
  dateFormat: string;
  locale: string;
  theme: string;
};

const row = (overrides: Partial<Row> = {}): Row => ({
  id: "user_1",
  preferredCurrency: "uah",
  timezone: "Europe/Kyiv",
  dateFormat: "DD/MM/YYYY",
  locale: "uk",
  theme: "system",
  ...overrides,
});

const fakeRepository = (initial: Row | null) => {
  let current = initial;

  return {
    store: () => current,
    findById: async () => current,
    upsert: async (userId: string, values: Partial<Row>) => {
      current = { ...(current ?? row({ id: userId })), ...values };
      return current;
    },
  };
};

describe("UserService", () => {
  it("reads preferences from the database", async () => {
    const repository = fakeRepository(row());

    const preferences = await UserService.getUserPreferences("user_1", {
      userRepository: repository,
    });

    expect(preferences).toEqual({
      preferredCurrency: "uah",
      preferredTimezone: "Europe/Kyiv",
      dateFormat: "DD/MM/YYYY",
      locale: "uk",
      theme: "system",
    });
  });

  it("returns defaults for a user with no row instead of throwing", async () => {
    const repository = fakeRepository(null);

    const preferences = await UserService.getUserPreferences("user_missing", {
      userRepository: repository,
    });

    expect(preferences).toEqual({
      preferredCurrency: "uah",
      preferredTimezone: "UTC",
      dateFormat: "DD/MM/YYYY",
      locale: "en",
      theme: "system",
    });
  });

  it("applies a partial patch without disturbing other fields", async () => {
    const repository = fakeRepository(row());

    const preferences = await UserService.updateUserPreferences(
      "user_1",
      { preferredCurrency: "USD" },
      { userRepository: repository },
    );

    expect(preferences.preferredCurrency).toBe("usd");
    expect(preferences.preferredTimezone).toBe("Europe/Kyiv");
    expect(preferences.locale).toBe("uk");
  });

  it("normalizes the currency code to lowercase on write", async () => {
    const repository = fakeRepository(row());

    await UserService.updateUserPreferences(
      "user_1",
      { preferredCurrency: "  EUR " },
      { userRepository: repository },
    );

    expect(repository.store()?.preferredCurrency).toBe("eur");
  });
});
