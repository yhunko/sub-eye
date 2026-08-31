import { useSyncExternalStore } from "react";
import Purchases, {
  type CustomerInfo,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesPackage,
} from "react-native-purchases";
import { env } from "@/shared/config/env";
import { deviceFlags } from "@/shared/lib/mmkv";
import { reportError } from "@/shared/lib/sentry";
import {
  DEV_FORCE_PRO_KEY,
  PRO_CACHE_KEY,
  readProEntitlement,
  resolvePro,
} from "./entitlement";

/**
 * SubEye Pro — one non-consumable, bought once, checked on the device.
 *
 * There is no server side to this. `users` gets no column: a cracked client
 * granting itself on-device reminders costs nothing at runtime, and a server
 * check would put a paywall in the money path to buy nothing.
 *
 * ponytail: `useSyncExternalStore` over a module variable, the same shape as
 * `subscriptionFilters`. One value, one writer, several readers across routes.
 */

/** `null` until RevenueCat answers. Never written from a failed call. */
let live: boolean | null = null;

const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// MMKV reads synchronously, so this is cheap enough to run per render and there
// is no second copy of the flag to keep in step. A primitive snapshot is also
// what useSyncExternalStore needs — a fresh object per call would loop forever.
const currentPro = (): boolean =>
  resolvePro({
    live,
    cached: deviceFlags.get(PRO_CACHE_KEY),
    // __DEV__, not an env var: a flag that configuration can enable is a flag
    // that ships enabled one day. Metro strips this branch from a release bundle.
    devOverride: __DEV__ && deviceFlags.get(DEV_FORCE_PRO_KEY),
  });

/** Fold a CustomerInfo into the store. An unreadable one changes nothing. */
function apply(customerInfo: CustomerInfo | null): void {
  const next = readProEntitlement(customerInfo);
  if (next === null) return;
  live = next;
  deviceFlags.set(PRO_CACHE_KEY, next);
  emit();
}

// CONFIGURE ANONYMOUSLY. There is no account to alias the customer onto, so the
// entitlement lives on the Apple Account: a non-consumable restores through it,
// which is what `restorePro` has always actually used. The cost is that a
// granted entitlement has no findable id in the RevenueCat dashboard.
try {
  Purchases.configure({ apiKey: env.REVENUECAT_IOS_KEY, appUserID: null });
  Purchases.addCustomerInfoUpdateListener(apply);
  void Purchases.getCustomerInfo()
    .then(apply)
    .catch(() => {
      // Offline at launch. The cached entitlement is the answer.
    });
} catch (error) {
  // A malformed key, or a Test Store `test_…` key in a release build — which
  // RevenueCat rejects outright. Fail open: every read falls back to the cache
  // and the gates behave as they did last launch.
  //
  // REPORT IT. Swallowing this is what made a dead paywall, dead dashboard
  // grants and a "could not load" purchase button look like three unrelated
  // bugs, with nothing anywhere to connect them to a wrong key.
  reportError(error, { scope: "purchases.configure" });
}

/** Whether this device may use the Pro features. Re-renders when that changes. */
export function usePro(): boolean {
  return useSyncExternalStore(subscribe, currentPro);
}

// Dev-only, and a GLOBAL rather than an exported const so that nothing at all is
// left behind: the whole `__DEV__` branch below folds away in a release bundle,
// and with no exported binding there is not even a `{}` to ship. `declare
// global` is types-only. Written by `@/widgets/developer-page`, read here.
declare global {
  // `var`, not `let`: only a `var` declaration becomes a property of
  // `globalThis` in TypeScript's model, which is how the writer reaches it.
  var __devPaywall: "loading" | "empty" | undefined;
}

/**
 * The one package in the `default` offering.
 *
 * `null` means RevenueCat has nothing to sell — almost always the Paid
 * Applications agreement, a product id typo, or an IAP still in "Missing
 * Metadata", rather than anything in this file.
 */
export async function fetchProPackage(): Promise<PurchasesPackage | null> {
  // Metro inlines `__DEV__` and the minifier drops the branch, so neither the
  // scenarios nor the global survive into a release bundle.
  if (__DEV__ && globalThis.__devPaywall) {
    const scenario = globalThis.__devPaywall;
    // ONE-SHOT. The paywall opened right after a dev scenario shows that state
    // and every later open talks to the real store again — so there is no stale
    // override to reset, and no reset button to forget to press.
    globalThis.__devPaywall = undefined;
    // A promise that never settles leaves the paywall's own spinner up; there
    // is no "loading" flag to fake.
    if (scenario === "loading") return new Promise(() => {});
    return null;
  }
  const { current } = await Purchases.getOfferings();
  if (!current) return null;
  // `lifetime` is the configured package type; the first available package
  // covers a dashboard that used a custom identifier instead.
  return current.lifetime ?? current.availablePackages[0] ?? null;
}

const isUserCancelled = (error: unknown): boolean =>
  (error as PurchasesError | null)?.code ===
  PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;

/**
 * `true` = entitled now. `false` = the user backed out, which is a no-op and
 * never an error toast. A real failure throws.
 */
export async function purchasePro(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    apply(customerInfo);
    return readProEntitlement(customerInfo) === true;
  } catch (error) {
    if (isUserCancelled(error)) return false;
    throw error;
  }
}

/** Guideline 3.1.1 — mandatory, and a reviewer who cannot find it rejects. */
export async function restorePro(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  apply(customerInfo);
  return readProEntitlement(customerInfo) === true;
}

/** Dev-only escape hatch so the gates can be flipped without a purchase. */
export const devForcePro = {
  get: (): boolean => deviceFlags.get(DEV_FORCE_PRO_KEY),
  set: (value: boolean): void => {
    deviceFlags.set(DEV_FORCE_PRO_KEY, value);
    emit();
  },
};
