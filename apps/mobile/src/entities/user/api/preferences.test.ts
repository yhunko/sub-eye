import { beforeEach, describe, expect, it } from "bun:test";
import type { UserPreferences } from "@subeye/model";
import { eraseDoc, readDoc } from "@/shared/lib/store";
import {
  preferencesKeys,
  preferencesQuery,
  updatePreferences,
} from "./preferences";

beforeEach(() => eraseDoc());

const runRead = (): Promise<UserPreferences> =>
  (preferencesQuery().queryFn as () => Promise<UserPreferences>)();

describe("preferencesKeys", () => {
  it("is a single stable key", () => {
    expect(preferencesKeys.all()).toEqual(["user", "preferences"]);
  });
});

describe("preferencesQuery", () => {
  it("reads the stored preferences", async () => {
    await updatePreferences({ preferredTimezone: "Europe/Kyiv" });

    await expect(runRead()).resolves.toMatchObject({
      preferredTimezone: "Europe/Kyiv",
    });
  });
});

describe("updatePreferences", () => {
  // A partial must stay partial. Writing the whole object would let a stale
  // screen overwrite a field the user changed somewhere else in the app.
  it("changes only what it was given", async () => {
    const before = await runRead();

    const updated = await updatePreferences({ preferredCurrency: "usd" });

    expect(updated.preferredCurrency).toBe("usd");
    expect(updated.preferredTimezone).toBe(before.preferredTimezone);
    expect(updated.dateFormat).toBe(before.dateFormat);
  });

  // The code is compared against a rate table keyed in lowercase, so a stored
  // "USD" silently disables conversion for every amount in the app.
  it("normalizes the currency code on the way in", async () => {
    await updatePreferences({ preferredCurrency: "USD" });

    expect(readDoc().preferences.preferredCurrency).toBe("usd");
  });

  it("persists to the document, not to memory", async () => {
    await updatePreferences({ dateFormat: "MM/DD/YYYY" });

    expect(readDoc().preferences.dateFormat).toBe("MM/DD/YYYY");
  });
});
