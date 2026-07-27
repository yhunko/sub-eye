import { describe, expect, it } from "bun:test";
import { resolveDeviceLocale } from "./locale";

// resolveDeviceLocale takes the device's ordered language preference list (as
// expo-localization reports it) and picks the first locale SubEye actually ships.
// The order matters: a device set to [de, uk, en] must get uk, not en.
describe("resolveDeviceLocale", () => {
  it("picks the first supported language in device preference order", () => {
    expect(resolveDeviceLocale(["de", "uk", "en"])).toBe("uk");
  });

  it("matches en and uk directly", () => {
    expect(resolveDeviceLocale(["en"])).toBe("en");
    expect(resolveDeviceLocale(["uk"])).toBe("uk");
  });

  it("falls back to en when the device speaks nothing we ship", () => {
    expect(resolveDeviceLocale(["de", "fr"])).toBe("en");
    expect(resolveDeviceLocale([])).toBe("en");
  });

  it("skips null language codes without treating them as a match", () => {
    expect(resolveDeviceLocale([null, "uk"])).toBe("uk");
  });
});
