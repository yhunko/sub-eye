import type {
  SubscriptionAllowedAction,
  SubscriptionStatus,
} from "@subeye/model";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";
import { m } from "@/shared/i18n";
import { presentChoice } from "@/shared/ui/present-choice";
import { useDeleteSubscription } from "../api/use-delete-subscription";
import {
  useCancelSubscription,
  usePauseSubscription,
  useRenewSubscription,
  useResumeSubscription,
} from "../api/use-lifecycle";

export type LifecycleActionItem = {
  key: string;
  label: string;
  destructive: boolean;
  run: () => void;
};

export type LifecycleActionTarget = {
  id: string;
  name: string;
  /**
   * Not derivable from `allowedActions`: both wind-down states offer `renew`,
   * and only the ended one is asked when it restarted.
   */
  status: SubscriptionStatus;
  allowedActions: readonly SubscriptionAllowedAction[];
  /** What to do once the delete mutation is fired. The detail screen pops. */
  onDeleted?: () => void;
};

/**
 * Turns a subscription's server-issued `allowedActions` into things the user can
 * tap.
 *
 * The server decides what is legal (`getAllowedActions`) and the order it comes
 * in is meaningful, so this preserves it rather than imposing its own. The
 * client never re-derives the legality rules — that duplicated state machine is
 * exactly what the DTO field exists to prevent.
 *
 * This is a BUILDER, not a per-subscription hook: the five mutations are
 * instantiated once by the caller and the returned function is applied to as
 * many rows as needed. The list screen renders swipe actions for every visible
 * row, and a hook-per-row would mean five TanStack mutation observers per row.
 */
export function useLifecycleActionBuilder() {
  const router = useRouter();
  const { mutate: pauseMutate } = usePauseSubscription();
  const { mutate: resumeMutate } = useResumeSubscription();
  const { mutate: cancelMutate } = useCancelSubscription();
  const { mutate: renewMutate } = useRenewSubscription();
  const { mutate: removeMutate } = useDeleteSubscription();

  return useCallback(
    ({
      id,
      name,
      status,
      allowedActions,
      onDeleted,
    }: LifecycleActionTarget): LifecycleActionItem[] => {
      const build: Partial<
        Record<SubscriptionAllowedAction, () => LifecycleActionItem>
      > = {
        edit: () => ({
          key: "edit",
          label: m.action_edit(),
          destructive: false,
          // One route for both modes: an `id` param means edit.
          run: () =>
            router.push({ pathname: "/subscriptions/form", params: { id } }),
        }),
        // addPhase, applyPhaseNow and cancelPhase are three server permissions
        // over one screen. They collapse to a single entry (deduped below)
        // rather than three menu items that all open the same sheet.
        addPhase: () => ({
          key: "pricing",
          label: m.action_managePricing(),
          destructive: false,
          run: () =>
            router.push({
              pathname: "/subscriptions/[id]/pricing",
              params: { id },
            }),
        }),
        pause: () => ({
          key: "pause",
          label: m.action_pause(),
          destructive: false,
          run: () =>
            presentChoice(m.confirm_pauseTitle(), name, [
              {
                label: m.confirm_pauseNoDate(),
                onPress: () => pauseMutate({ id, resumeAt: null }),
              },
              {
                // Choosing a date needs a picker, which an Alert cannot host —
                // so it gets the app's only sheet mechanism, a formSheet route.
                label: m.confirm_pauseUntilDate(),
                onPress: () =>
                  router.push({
                    pathname: "/subscriptions/[id]/pause",
                    params: { id },
                  }),
              },
            ]),
        }),
        resume: () => ({
          key: "resume",
          label: m.action_resume(),
          destructive: false,
          run: () => resumeMutate({ id }),
        }),
        cancel: () => ({
          key: "cancel",
          label: m.action_cancel(),
          destructive: false,
          run: () =>
            presentChoice(
              m.confirm_cancelTitle(),
              m.confirm_cancelBody({ name }),
              [
                {
                  label: m.action_cancelPeriodEnd(),
                  onPress: () => cancelMutate({ id, mode: "periodEnd" }),
                },
                {
                  // Stops billing now and forfeits the rest of the paid period.
                  label: m.action_cancelImmediate(),
                  destructive: true,
                  onPress: () => cancelMutate({ id, mode: "immediate" }),
                },
              ],
            ),
        }),
        // Two states offer `renew` and they mean different things. A
        // `cancelling` subscription never stopped billing, so un-cancelling it
        // is a one-tap undo. An ENDED one is starting over, and the app has no
        // idea when — the user may have resubscribed weeks ago and only now
        // opened it. Renewing that silently on today's date would put every
        // projected payment on the wrong day, so it asks.
        // The LABEL differs for the same reason the behaviour does. On a
        // cancelling subscription this is "Keep subscription" — an undo, and it
        // still has one to keep. On an ended one there is nothing left to keep,
        // so it is "Start again".
        renew: () => ({
          key: "renew",
          label: status === "cancelled" ? m.action_restart() : m.action_renew(),
          destructive: false,
          run:
            status === "cancelled"
              ? () =>
                  router.push({
                    pathname: "/subscriptions/[id]/renew",
                    params: { id },
                  })
              : () => renewMutate({ id }),
        }),
        delete: () => ({
          key: "delete",
          label: m.action_delete(),
          destructive: true,
          run: () =>
            Alert.alert(
              m.confirm_deleteTitle(),
              m.confirm_deleteBody({ name }),
              [
                { text: m.common_cancel(), style: "cancel" },
                {
                  text: m.action_delete(),
                  style: "destructive",
                  onPress: () => {
                    // The optimistic delete has already dropped the row from the
                    // list cache, so a caller that pops lands on a correct list.
                    removeMutate({ id });
                    onDeleted?.();
                  },
                },
              ],
            ),
        }),
      };

      const seen = new Set<string>();

      return allowedActions.flatMap((action) => {
        const item = build[action]?.();
        if (!item || seen.has(item.key)) return [];
        seen.add(item.key);
        return [item];
      });
    },
    [
      router,
      pauseMutate,
      resumeMutate,
      cancelMutate,
      renewMutate,
      removeMutate,
    ],
  );
}
