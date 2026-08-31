import { describe, expect, it } from "bun:test";
import { readPreferences, writePreferences } from "../src";
import { inMemoryPorts } from "./inMemoryPorts";

const seeded = () =>
  inMemoryPorts({
    preferences: {
      preferredCurrency: "uah",
      preferredTimezone: "Europe/Kyiv",
      dateFormat: "DD/MM/YYYY",
      locale: "uk",
      theme: "system",
    },
  });

describe("preferences", () => {
  it("reads what is stored", async () => {
    expect(await readPreferences(seeded())).toEqual({
      preferredCurrency: "uah",
      preferredTimezone: "Europe/Kyiv",
      dateFormat: "DD/MM/YYYY",
      locale: "uk",
      theme: "system",
    });
  });

  it("applies a partial patch without disturbing other fields", async () => {
    const ports = seeded();

    const preferences = await writePreferences(ports, {
      preferredCurrency: "USD",
    });

    expect(preferences.preferredCurrency).toBe("usd");
    expect(preferences.preferredTimezone).toBe("Europe/Kyiv");
    expect(preferences.locale).toBe("uk");
  });

  it("normalizes the currency code on write", async () => {
    const ports = seeded();

    await writePreferences(ports, { preferredCurrency: "  EUR " });

    // Stored, not just returned: the code is the key into a rate table written
    // in lowercase, so an un-normalized one disables conversion for the
    // account until the next write happens to fix it.
    expect((await readPreferences(ports)).preferredCurrency).toBe("eur");
  });

  it("leaves the currency alone when the patch does not mention it", async () => {
    const ports = seeded();

    const preferences = await writePreferences(ports, { theme: "dark" });

    expect(preferences.preferredCurrency).toBe("uah");
    expect(preferences.theme).toBe("dark");
  });
});
