import { afterEach, describe, expect, it } from "bun:test";
import type { UserPreferences } from "@subeye/shared";

// The entity builds on the real apiClient, whose env module validates the
// EXPO_PUBLIC_* vars at import time — set them before the dynamic import below.
process.env.EXPO_PUBLIC_API_URL = "https://api.test";
process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_x";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

type Recorded = { url: string; method?: string; body?: string };

// Stubs the transport rather than mocking the api module (bun's mock.module is
// process-global and would leak into client.test.ts). Recording the real request
// also proves the PATCH is serialised the way the server's validator expects.
function stubJson(body: unknown): Recorded[] {
  const calls: Recorded[] = [];
  globalThis.fetch = ((input: unknown, init?: RequestInit) => {
    calls.push({
      url: input instanceof Request ? input.url : String(input),
      method: init?.method,
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }) as typeof fetch;
  return calls;
}

const { preferencesKeys, preferencesQuery, updatePreferences } = await import(
  "./preferences"
);

const prefs: UserPreferences = {
  preferredCurrency: "uah",
  preferredTimezone: "Europe/Kyiv",
  dateFormat: "DD.MM.YYYY",
  locale: "uk",
  theme: "system",
};

describe("preferencesKeys", () => {
  it("is a single stable key", () => {
    expect(preferencesKeys.all()).toEqual(["user", "preferences"]);
  });
});

describe("preferencesQuery", () => {
  it("returns the parsed preferences", async () => {
    stubJson(prefs);
    const queryFn = preferencesQuery()
      .queryFn as () => Promise<UserPreferences>;

    await expect(queryFn()).resolves.toEqual(prefs);
  });
});

describe("updatePreferences", () => {
  // A PATCH must send ONLY what changed. Sending the whole object would let a
  // stale screen overwrite a field the user changed on another device.
  it("sends exactly the partial it was given", async () => {
    const calls = stubJson({ ...prefs, preferredCurrency: "usd" });

    await updatePreferences({ preferredCurrency: "usd" });

    expect(calls[0]?.method).toBe("PATCH");
    expect(calls[0]?.url).toContain("/api/user/preferences");
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      preferredCurrency: "usd",
    });
  });

  it("returns the server's updated preferences, not the input", async () => {
    const updated = { ...prefs, preferredTimezone: "Europe/Warsaw" };
    stubJson(updated);

    await expect(
      updatePreferences({ preferredTimezone: "Europe/Warsaw" }),
    ).resolves.toEqual(updated);
  });
});
