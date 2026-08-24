import type {
  SubscriptionAllowedAction,
  SubscriptionStatus,
} from "@subeye/model";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { usePro } from "@/entities/pro";
import {
  type LifecycleActionItem,
  useLifecycleActionBuilder,
} from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { presentChoice } from "@/shared/ui/present-choice";

export type { LifecycleActionItem };

/**
 * The detail screen's split of the lifecycle actions: one primary button plus an
 * overflow sheet. The actions themselves — and their confirm flows — come from
 * `useLifecycleActionBuilder`, which the subscriptions list also uses for its
 * swipe actions.
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

  // Edit earns a real button. In the retired web client it sat behind an
  // ellipsis with everything else; it is the action people reach for most.
  const primary = useMemo(
    () => barItems.find((item) => item.key === "edit") ?? null,
    [barItems],
  );
  const overflow = useMemo(
    () => barItems.filter((item) => item.key !== primary?.key),
    [barItems, primary],
  );

  const showOverflow = useCallback(
    () =>
      presentChoice(
        name,
        m.detail_moreActions(),
        overflow.map((item) => ({
          label: item.label,
          destructive: item.destructive,
          onPress: item.run,
        })),
      ),
    [name, overflow],
  );

  return { primary, overflow, showOverflow, pageAction };
}
