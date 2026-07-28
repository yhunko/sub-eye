import { describe, expect, it } from "bun:test";
import type { CustomerInfo } from "react-native-purchases";
import { readProEntitlement, resolvePro } from "./entitlement";

// Structural stand-in: CustomerInfo has ~15 fields the gate never reads, and a
// full fixture would only pin fields nobody asserts on.
const info = (active: Record<string, unknown>) =>
  ({ entitlements: { active } }) as unknown as CustomerInfo;

describe("readProEntitlement", () => {
  it("is true only when 'pro' is in the active map", () => {
    expect(readProEntitlement(info({ pro: {} }))).toBe(true);
    expect(readProEntitlement(info({}))).toBe(false);
    // An entitlement RevenueCat knows about but that is not ours must not unlock.
    expect(readProEntitlement(info({ plus: {} }))).toBe(false);
  });

  it("says 'unknown', not 'false', when there is nothing to read", () => {
    // The whole point of the null: these are outages, not downgrades.
    expect(readProEntitlement(null)).toBeNull();
    expect(readProEntitlement(undefined)).toBeNull();
    expect(readProEntitlement({} as CustomerInfo)).toBeNull();
  });
});

describe("resolvePro", () => {
  it("keeps a paying user Pro when RevenueCat cannot be reached", () => {
    // The airplane-mode cold start. Regressing this bills someone for nothing.
    expect(resolvePro({ live: null, cached: true, devOverride: false })).toBe(
      true,
    );
  });

  it("leaves an uncached user free rather than erroring", () => {
    expect(resolvePro({ live: null, cached: false, devOverride: false })).toBe(
      false,
    );
  });

  it("lets a live answer overrule the cache in both directions", () => {
    // A refund has to be able to take Pro away, not only grant it.
    expect(resolvePro({ live: false, cached: true, devOverride: false })).toBe(
      false,
    );
    expect(resolvePro({ live: true, cached: false, devOverride: false })).toBe(
      true,
    );
  });

  it("lets the dev override win over a live 'not entitled'", () => {
    expect(resolvePro({ live: false, cached: false, devOverride: true })).toBe(
      true,
    );
  });
});
