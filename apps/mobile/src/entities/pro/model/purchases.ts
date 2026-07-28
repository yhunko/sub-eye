import { useAuth } from "@clerk/clerk-expo";
import { useEffect, useSyncExternalStore } from "react";
import Purchases, {
  type CustomerInfo,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesPackage,
} from "react-native-purchases";
import { env } from "@/shared/config/env";
import { deviceFlags } from "@/shared/lib/mmkv";
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

// CONFIGURE ANONYMOUSLY, ALIAS THE CLERK ID IN LATER (`useProIdentity`).
// Passing the Clerk id straight to `configure` cannot work — module scope runs
// before Clerk has a session — and it would strand a purchase made before
// sign-in on an anonymous customer nobody ever looks at again.
try {
  Purchases.configure({ apiKey: env.REVENUECAT_IOS_KEY, appUserID: null });
  Purchases.addCustomerInfoUpdateListener(apply);
  void Purchases.getCustomerInfo()
    .then(apply)
    .catch(() => {
      // Offline at launch. The cached entitlement is the answer.
    });
} catch {
  // A malformed key, or Android running with an `appl_…` one. Fail open: every
  // read falls back to the cache and the gates behave as they did last launch.
}

/** Whether this device may use the Pro features. Re-renders when that changes. */
export function usePro(): boolean {
  return useSyncExternalStore(subscribe, currentPro);
}

/**
 * Renders nothing; keeps RevenueCat's app user id equal to the Clerk user id.
 *
 * That identity is what makes a granted entitlement findable in the dashboard
 * and what joins a purchase to the server's PostHog `distinct_id`.
 */
export function useProIdentity(): void {
  const { isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (userId) {
      void Purchases.logIn(userId)
        .then((result) => apply(result.customerInfo))
        .catch(() => {
          // Offline. The alias is retried on the next auth change or launch.
        });
      return;
    }

    // Explicitly false, not merely falsy: before Clerk resolves, `isSignedIn` is
    // undefined and logging out then would discard a real customer.
    if (isSignedIn === false) {
      void Purchases.logOut()
        .then(apply)
        .catch(() => {
          // Already anonymous — logOut throws on that, and it is not an error.
        });
    }
  }, [isSignedIn, userId]);
}

/**
 * The one package in the `default` offering.
 *
 * `null` means RevenueCat has nothing to sell — almost always the Paid
 * Applications agreement, a product id typo, or an IAP still in "Missing
 * Metadata", rather than anything in this file.
 */
export async function fetchProPackage(): Promise<PurchasesPackage | null> {
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
