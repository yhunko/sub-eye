import type { SubscriptionAllowedAction } from "@subeye/shared";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
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
  allowedActions,
}: {
  id: string;
  name: string;
  allowedActions: readonly SubscriptionAllowedAction[];
}) {
  const router = useRouter();
  const build = useLifecycleActionBuilder();

  const items = useMemo(
    () =>
      build({
        id,
        name,
        allowedActions,
        // Deleting from the detail screen leaves nothing to look at.
        onDeleted: () => router.back(),
      }),
    [build, id, name, allowedActions, router],
  );

  // Edit earns a real button. In the retired web client it sat behind an
  // ellipsis with everything else; it is the action people reach for most.
  //
  // A cancelled subscription has no `edit` action at all (see getAllowedActions),
  // so that screen used to open with nothing but an ellipsis. Renew is the move
  // someone is there to make, and it takes the slot instead.
  const primary = useMemo(
    () =>
      items.find((item) => item.key === "edit") ??
      items.find((item) => item.key === "renew") ??
      null,
    [items],
  );
  const overflow = useMemo(
    () => items.filter((item) => item.key !== primary?.key),
    [items, primary],
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

  return { primary, overflow, showOverflow };
}
