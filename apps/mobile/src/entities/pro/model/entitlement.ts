import type { CustomerInfo } from "react-native-purchases";

/** Configured in the RevenueCat dashboard. This exact string is the contract. */
export const PRO_ENTITLEMENT_ID = "pro";

/** MMKV: the last entitlement RevenueCat actually confirmed, on this device. */
export const PRO_CACHE_KEY = "pro.entitled";

/** MMKV: the `__DEV__`-only override behind the hidden Settings row. */
export const DEV_FORCE_PRO_KEY = "dev.forcePro";

/**
 * What RevenueCat says right now — or `null` for "it did not say".
 *
 * A thrown SDK call, a dead network and a `customerInfo` with no entitlements
 * object are all the same answer: unknown. They must NOT collapse to `false`, or
 * a RevenueCat outage downgrades a paying user mid-session.
 */
export function readProEntitlement(
  customerInfo: CustomerInfo | null | undefined,
): boolean | null {
  const active = customerInfo?.entitlements?.active;
  if (!active) return null;
  return PRO_ENTITLEMENT_ID in active;
}

/**
 * Fail open. The cached answer stands until RevenueCat contradicts it, so a cold
 * start in airplane mode leaves a paying user Pro; an uncached user stays free
 * silently, with no error screen.
 */
export function resolvePro({
  live,
  cached,
  devOverride,
}: {
  /** `null` = RevenueCat has not answered since this launch. */
  live: boolean | null;
  cached: boolean;
  /** The caller has already ANDed this with `__DEV__`. */
  devOverride: boolean;
}): boolean {
  return (live ?? cached) || devOverride;
}
