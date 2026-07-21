import type { SubscriptionAllowedAction } from "@subeye/shared";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import {
  useCancelSubscription,
  useDeleteSubscription,
  usePauseSubscription,
  useRenewSubscription,
  useResumeSubscription,
} from "@/entities/subscription";
import { m } from "@/shared/i18n";

export type LifecycleActionItem = {
  key: string;
  label: string;
  destructive: boolean;
  run: () => void;
};

type Choice = { label: string; destructive?: boolean; onPress: () => void };

/**
 * A choice among several actions, presented by the OS. There is no NiceModal
 * here and no custom dialog component — the navigator owns presentation, so
 * confirms are the platform's own: a real action sheet on iOS, the equivalent
 * Alert with buttons on Android (where ActionSheetIOS does not exist).
 */
function presentChoice(
  title: string,
  message: string,
  choices: Choice[],
): void {
  if (Platform.OS === "ios") {
    const options = [
      ...choices.map((choice) => choice.label),
      m.common_cancel(),
    ];
    const destructiveIndex = choices.findIndex((choice) => choice.destructive);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options,
        cancelButtonIndex: options.length - 1,
        // findIndex yields -1 when nothing is destructive, which UIKit reads as
        // a real index; undefined is what it expects for "none".
        ...(destructiveIndex >= 0
          ? { destructiveButtonIndex: destructiveIndex }
          : {}),
      },
      (index) => choices[index]?.onPress(),
    );
    return;
  }

  Alert.alert(title, message, [
    ...choices.map((choice) => ({
      text: choice.label,
      style: choice.destructive
        ? ("destructive" as const)
        : ("default" as const),
      onPress: choice.onPress,
    })),
    { text: m.common_cancel(), style: "cancel" as const },
  ]);
}

/**
 * Turns the server's `allowedActions` into things the user can tap.
 *
 * The server decides what is legal (`getAllowedActions`) and the order it comes
 * in is meaningful, so this preserves it rather than imposing its own. The
 * client never re-derives the legality rules — that duplicated state machine is
 * exactly what the DTO field exists to prevent.
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
  const pause = usePauseSubscription();
  const resume = useResumeSubscription();
  const cancel = useCancelSubscription();
  const renew = useRenewSubscription();
  const remove = useDeleteSubscription();

  const { mutate: pauseMutate } = pause;
  const { mutate: resumeMutate } = resume;
  const { mutate: cancelMutate } = cancel;
  const { mutate: renewMutate } = renew;
  const { mutate: removeMutate } = remove;

  const items = useMemo<LifecycleActionItem[]>(() => {
    const build: Partial<
      Record<SubscriptionAllowedAction, () => LifecycleActionItem>
    > = {
      edit: () => ({
        key: "edit",
        label: m.action_edit(),
        destructive: false,
        run: () =>
          router.push({
            pathname: "/subscriptions/[id]/edit",
            params: { id },
          }),
      }),
      // addPhase, applyPhaseNow and cancelPhase are three server permissions
      // over one screen. They collapse to a single entry (deduped below) rather
      // than three menu items that all open the same sheet.
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
              // Choosing a date needs a picker, which an Alert cannot host — so
              // it gets the app's only sheet mechanism, a formSheet route.
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
      renew: () => ({
        key: "renew",
        label: m.action_renew(),
        destructive: false,
        run: () => renewMutate({ id }),
      }),
      delete: () => ({
        key: "delete",
        label: m.action_delete(),
        destructive: true,
        run: () =>
          Alert.alert(m.confirm_deleteTitle(), m.confirm_deleteBody({ name }), [
            { text: m.common_cancel(), style: "cancel" },
            {
              text: m.action_delete(),
              style: "destructive",
              onPress: () => {
                // The optimistic delete has already dropped the row from the
                // list cache, so going back lands on a correct list immediately.
                removeMutate({ id });
                router.back();
              },
            },
          ]),
      }),
    };

    const seen = new Set<string>();

    return allowedActions.flatMap((action) => {
      const item = build[action]?.();
      if (!item || seen.has(item.key)) return [];
      seen.add(item.key);
      return [item];
    });
  }, [
    allowedActions,
    id,
    name,
    router,
    pauseMutate,
    resumeMutate,
    cancelMutate,
    renewMutate,
    removeMutate,
  ]);

  // Edit earns a real button. In the retired web client it sat behind an
  // ellipsis with everything else; it is the action people reach for most.
  const primary = items.find((item) => item.key === "edit") ?? null;
  const overflow = useMemo(
    () => items.filter((item) => item.key !== "edit"),
    [items],
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
