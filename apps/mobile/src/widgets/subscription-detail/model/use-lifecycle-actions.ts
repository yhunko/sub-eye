import type {
  SubscriptionAllowedAction,
  SubscriptionStatus,
} from "@subeye/model";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { usePro } from "@/entities/pro";
import {
  type LifecycleActionItem,
  useLifecycleActionBuilder,
} from "@/entities/subscription";

export type { LifecycleActionItem };

/**
 * The detail screen's ordering of the lifecycle actions: the one that leads the
 * menu, then the rest. PRESENTATION is the page's — it has to fold the pricing
 * submenu in between them, which is none of this hook's business. The actions
 * themselves, and their confirm flows, come from `useLifecycleActionBuilder`,
 * which the subscriptions list also uses for its swipe actions.
 */
export function useLifecycleActions({
  id,
  name,
  status,
  allowedActions,
}: {
  id: string;
  name: string;
  status: SubscriptionStatus;
  allowedActions: readonly SubscriptionAllowedAction[];
}) {
  const router = useRouter();
  const isPro = usePro();
  const build = useLifecycleActionBuilder();

  const items = useMemo(() => {
    const built = build({
      id,
      name,
      status,
      allowedActions,
      // Deleting from the detail screen leaves nothing to look at.
      onDeleted: () => router.back(),
    });

    if (isPro) return built;

    // Same row, different destination. The gate sits on the way IN rather than
    // inside a sheet that has already opened — and the row stays, because an
    // action that appears only for some users reads as a bug.
    return built.map((item) =>
      item.key === "pricing"
        ? { ...item, run: () => router.push("/paywall") }
        : item,
    );
  }, [build, id, name, status, allowedActions, router, isPro]);

  // A finished subscription's one real action moves OUT of the nav bar and onto
  // the page, where the screen is otherwise empty and a full-width button can
  // say what a glyph cannot. It is removed from the bar entirely rather than
  // left in the overflow: one action, offered twice on one screen, is two things
  // to read and decide between.
  const pageAction = useMemo(
    () =>
      status === "cancelled"
        ? (items.find((item) => item.key === "renew") ?? null)
        : null,
    [items, status],
  );

  const barItems = useMemo(
    () => (pageAction ? items.filter((item) => item !== pageAction) : items),
    [items, pageAction],
  );

  // Edit LEADS the menu rather than taking a bar button of its own. It is still
  // the action people reach for most, which is what earned it the button — but a
  // second glass capsule beside the ellipsis is a second control to read on a
  // screen whose whole claim is that everything about a subscription lives
  // behind one, and it crowded out the banner's centred identity. First item in
  // the menu is one tap further and no worse to find.
  const lead = useMemo(
    () => barItems.find((item) => item.key === "edit") ?? null,
    [barItems],
  );
  const overflow = useMemo(
    () => barItems.filter((item) => item.key !== lead?.key),
    [barItems, lead],
  );

  return { lead, overflow, pageAction };
}
