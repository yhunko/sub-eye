import type { SubscriptionDto } from "@subeye/model";
import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import { memo, useCallback, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import type { LifecycleActionTarget } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import {
  daysUntil,
  formatDaysUntil,
  formatMoney,
  formatShortDate,
} from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors, statusTint } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";

/**
 * A FLOOR, not a height. At every normal text size the row's content is well
 * under it, so cells stay uniform and VirtualizedList's length estimate is exact
 * after the first one — but a fixed height is what forced a cap on the text, and
 * the cap is what fails Apple's Larger Text criterion. `ReanimatedSwipeable`
 * sizes its container to this row and absolutely-fills the actions behind it, so
 * it needs no height of its own either.
 */
const ROW_HEIGHT = 64;
const ROW_GAP = 8;

// The lifecycle actions worth a swipe. `edit`, `pricing` and `delete` are also
// legal on most rows but they belong on the detail screen — a swipe is for the
// one-tap decision, not for navigation or for something irreversible.
//
// Icons are real platform symbols (SF Symbols on iOS, Material Symbols on
// Android) rather than drawn glyphs: expo-symbols ships with expo-router, so
// this is the same icon source the native tab bar already draws from.
const SWIPE_ACTIONS: Record<
  string,
  {
    label: () => string;
    ios: SFSymbol;
    android: AndroidSymbol;
    color: string;
  }
> = {
  pause: {
    label: m.subs_swipePause,
    ios: "pause.fill",
    android: "pause",
    color: colors.warning,
  },
  resume: {
    label: m.subs_swipeResume,
    ios: "play.fill",
    android: "play_arrow",
    color: colors.accent,
  },
  cancel: {
    label: m.subs_swipeCancel,
    ios: "xmark",
    android: "close",
    color: colors.danger,
  },
  renew: {
    label: m.subs_swipeKeep,
    ios: "arrow.clockwise",
    android: "refresh",
    color: colors.accent,
  },
};

// "active" is styled by its absence: statusTint.active IS the plain surface, so
// the three statuses that matter are the only ones that read as different.
const STATUS_LABEL: Record<string, () => string> = {
  paused: m.subs_status_paused,
  cancelling: m.subs_status_cancelling,
  cancelled: m.subs_status_cancelled,
};

export const SubscriptionRow = memo(function SubscriptionRow({
  item,
  onPress,
  buildActions,
  onSwipeOpen,
}: {
  item: SubscriptionDto;
  onPress: (item: SubscriptionDto) => void;
  /** Stable, page-scoped: see `useLifecycleActionBuilder`. */
  buildActions: (target: LifecycleActionTarget) => {
    key: string;
    run: () => void;
  }[];
  /** Lets the page close whichever other row is currently open. */
  onSwipeOpen: (row: SwipeableMethods) => void;
}) {
  const swipeRef = useRef<SwipeableMethods>(null);
  // A ref, not state: a tap on an open row should close it instead of
  // navigating, and re-rendering the row to track that would defeat the memo.
  const isOpen = useRef(false);
  // The swipe and the row's own press are in two different gesture systems —
  // the pan is gesture-handler's, `Pressable` is RN's responder — and the finger
  // lifting inside the row fires BOTH, so a swipe used to open the actions and
  // push the detail screen at the same time. `isOpen` hid it from the second
  // swipe onwards, which is why it only ever looked like a first-swipe bug.
  //
  // Cleared on touch-down rather than consumed by the press: a swipe does not
  // always produce one, and a flag left standing would eat the next real tap.
  const dragged = useRef(false);

  // The amount joins the name's column at the accessibility text sizes. Beside
  // it there is nothing left to shrink: the name is already the flexible half.
  const stacked = useLargeText();

  const actions = useMemo(
    () =>
      buildActions({
        id: item.id,
        name: item.name,
        status: item.status,
        allowedActions: item.allowedActions,
      }).filter((action) => action.key in SWIPE_ACTIONS),
    [buildActions, item.id, item.name, item.status, item.allowedActions],
  );

  // A solid colour capsule with the glyph in it, and the label OUTSIDE and under
  // it — the shape Telegram and Mail use. Filling the full row height with a
  // tinted rectangle and centring wrapped text in it is what read as cheap.
  const renderRightActions = useCallback(
    () => (
      <View style={styles.actions}>
        {actions.map((action) => {
          const spec = SWIPE_ACTIONS[action.key];
          if (!spec) return null;
          // `renew` is two actions under one key: an undo on a subscription that
          // is winding down, a restart on one that has ended. The capsule caption
          // has no room for either full label from `lifecycle-actions`, so it
          // makes the same distinction in the short forms this list uses.
          const label =
            action.key === "renew" && item.status === "cancelled"
              ? m.action_restart()
              : spec.label();
          return (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => {
                swipeRef.current?.close();
                action.run();
              }}
              style={styles.action}
            >
              <View style={[styles.pill, { backgroundColor: spec.color }]}>
                <SymbolView
                  name={{ ios: spec.ios, android: spec.android }}
                  size={20}
                  tintColor="#ffffff"
                  weight="semibold"
                />
              </View>
              {/* The caption goes at the accessibility text sizes rather than
                  growing: three captions at 37pt are wider than the screen, and
                  a reveal you cannot swipe far enough to see is worse than one
                  that is glyphs only. It survives as the button's own
                  accessibility label above, and every action here is also on the
                  detail screen, where the words have a full width to sit in. */}
              {stacked ? null : (
                <Text style={styles.actionLabel} numberOfLines={1}>
                  {label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    ),
    [actions, item.status, stacked],
  );

  // Each status is asking a different question of the same slot. Cancelled is
  // the one that was WRONG: the server still computes a nextPaymentDate for it,
  // so a dead subscription was advertising a payment it will never take.
  const cancelled = item.status === "cancelled";
  const date =
    cancelled && item.willBeCancelledAt
      ? item.willBeCancelledAt
      : item.status === "paused" && item.resumeAt
        ? item.resumeAt
        : item.nextPaymentDate;

  // NORMALISED TO A MONTH, and only ever in the home currency.
  //
  // The list is a comparison, and `preferred.amount` is the amount as charged —
  // so a yearly subscription sat next to monthly ones as one big number that
  // meant something different from its neighbours. `preferred.monthly` is what
  // the cost sort already ranked by, so the column and the ordering now agree.
  // The as-charged figure and its original currency belong on the detail screen,
  // where there is room to explain them.
  const preferred = item.billing.preferred;
  const primary = formatMoney(preferred.monthly, preferred.currencyCode);

  const tint = statusTint[item.status];
  const statusLabel = STATUS_LABEL[item.status]?.();

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      // No swipe affordance at all when nothing is legal on this row.
      enabled={actions.length > 0}
      friction={1.6}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={styles.container}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        if (swipeRef.current) onSwipeOpen(swipeRef.current);
      }}
      onSwipeableOpenStartDrag={() => {
        dragged.current = true;
      }}
      onSwipeableCloseStartDrag={() => {
        dragged.current = true;
      }}
      onSwipeableOpen={() => {
        isOpen.current = true;
      }}
      onSwipeableClose={() => {
        isOpen.current = false;
      }}
    >
      <Pressable
        accessibilityRole="button"
        // Colour alone must not carry the status — the tint is the visual
        // signal, this is the one a screen reader gets.
        accessibilityLabel={[
          item.name,
          statusLabel,
          // Spelled out — a screen reader saying "slash m o" is not a price.
          m.subs_amountPerMonth({ amount: primary }),
        ]
          .filter(Boolean)
          .join(", ")}
        onPressIn={() => {
          dragged.current = false;
        }}
        onPress={() => {
          if (dragged.current) return;
          if (isOpen.current) {
            swipeRef.current?.close();
            return;
          }
          onPress(item);
        }}
        style={[
          styles.row,
          { backgroundColor: tint.bg, borderColor: tint.border },
        ]}
      >
        <BrandLogo
          name={item.name}
          brandDomain={item.brandDomain}
          size={38}
          dimmed={cancelled}
        />

        <View style={styles.middle}>
          <Text
            style={[styles.name, cancelled && styles.spent]}
            numberOfLines={stacked ? undefined : 1}
          >
            {item.name}
          </Text>
          {/* The status word is on screen, not just in the label above. The
              tint was carrying `paused` and `cancelling` alone, which fails on
              colour vision as well as in greyscale — and the date beside it
              means something different per status (a resume for a paused row,
              a charge for an active one) while reading identically. Status
              first, so a narrow row truncates the half that matters least. */}
          <Text style={styles.sub} numberOfLines={stacked ? undefined : 1}>
            {cancelled
              ? m.subs_ended({ date: formatShortDate(date) })
              : statusLabel
                ? `${statusLabel} · ${formatDaysUntil(daysUntil(date), date)}`
                : formatDaysUntil(daysUntil(date), date)}
          </Text>
          {/* One line, one currency. The cadence suffix is what stops a
              normalised figure from reading as the amount actually charged. */}
          {stacked ? (
            <Text
              style={[
                styles.amount,
                styles.amountStacked,
                cancelled && styles.amountSpent,
              ]}
            >
              {primary}
              <Text style={styles.cadence}>{m.subs_perMonthSuffix()}</Text>
            </Text>
          ) : null}
        </View>

        {stacked ? null : (
          <Text
            style={[styles.amount, cancelled && styles.amountSpent]}
            numberOfLines={1}
          >
            {primary}
            <Text style={styles.cadence}>{m.subs_perMonthSuffix()}</Text>
          </Text>
        )}
      </Pressable>
    </ReanimatedSwipeable>
  );
});

const RADIUS = 18;

const styles = StyleSheet.create({
  // The gap between rows lives here rather than in the list's contentContainer:
  // the swipe container is the outermost element of a cell, and a container gap
  // would put dead space inside the clipped swipe area.
  //
  // Deliberately NOT rounded. The library clips this container, so a radius here
  // bites the corners off the revealed actions — it was eating the last letter
  // of the bottom-right label. The card inside carries the app's rounding; the
  // clip boundary only has to be square.
  container: {
    minHeight: ROW_HEIGHT,
    marginBottom: ROW_GAP,
  },
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderRadius: RADIUS,
    paddingHorizontal: 10,
    // Zero at the default size — the content is 29pt inside a 64pt floor — and
    // the only thing keeping the text off the rounded corners once it grows.
    paddingVertical: 8,
  },
  middle: { flex: 1, minWidth: 0 },
  // No status badge: the row's own fill carries it, which buys the name the full
  // width back on exactly the rows whose names tend to be longest.
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  // Struck through AND muted: the strike alone still reads as an emphasised row
  // at a glance, which is the opposite of what a finished subscription is.
  spent: { textDecorationLine: "line-through", color: colors.muted },
  amountSpent: { color: colors.muted },
  sub: { marginTop: 2, fontSize: 12.5, color: colors.muted },
  amount: {
    fontSize: 15.5,
    fontWeight: "700",
    color: colors.text,
    // Digits stop jittering between rows and during optimistic updates.
    fontVariant: ["tabular-nums"],
  },
  amountStacked: { marginTop: 3 },
  // Nested in the amount so it rides the same baseline; muted and small so the
  // number stays the thing being compared.
  cadence: { fontSize: 11.5, fontWeight: "600", color: colors.muted },
  // Laid out left-to-right here; the library's wrapper pins the group to the
  // trailing edge, so the destructive action ends up furthest out, as in Mail.
  actions: {
    flexDirection: "row",
    alignItems: "center",
    // Full height of whatever the row grew to, not of what it was: the reveal
    // is absolutely filled behind a row that is no longer a fixed ROW_HEIGHT.
    height: "100%",
    paddingLeft: 8,
    // Keeps the outermost label off the clip boundary now that it is square.
    paddingRight: 2,
    gap: 6,
  },
  // The label is free to be wider than its capsule (a translated "Pause" often
  // is); the column just refuses to get narrower than one.
  action: { alignItems: "center", gap: 3, minWidth: 54 },
  pill: {
    width: 54,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.muted,
    // Ceiling on how far one long translation can push the reveal open.
    maxWidth: 82,
  },
});
