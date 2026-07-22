import type { SubscriptionDto } from "@subeye/shared";
import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import { memo, useCallback, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import type { LifecycleActionTarget } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { daysUntil, formatDaysUntil, formatMoney } from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors, LAYOUT_FONT_SCALE_MAX, statusTint } from "@/shared/ui/theme";

/**
 * Rows are a FIXED height. Uniform cells let VirtualizedList's length estimate
 * be exact after the first measured cell, so scrolling a long list never
 * re-flows, and the swipe container underneath needs a concrete height anyway.
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

  const actions = useMemo(
    () =>
      buildActions({
        id: item.id,
        name: item.name,
        allowedActions: item.allowedActions,
      }).filter((action) => action.key in SWIPE_ACTIONS),
    [buildActions, item.id, item.name, item.allowedActions],
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
          const label = spec.label();
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
              <Text
                style={styles.actionLabel}
                numberOfLines={1}
                maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    ),
    [actions],
  );

  // Paused rows answer "when does this start costing again", not "when is the
  // next payment" — the resume date is the number the user is looking for.
  const date =
    item.status === "paused" && item.resumeAt
      ? item.resumeAt
      : item.nextPaymentDate;

  const preferred = item.billing.preferred;
  const primary = formatMoney(preferred.amount, preferred.currencyCode);
  // The charged amount only earns a second line when it is genuinely a different
  // currency; on a same-currency row it would just repeat the number above it.
  const charged =
    preferred.currencyCode.trim().toLowerCase() !==
    item.currency.trim().toLowerCase()
      ? formatMoney(item.cost, item.currency)
      : null;

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
        accessibilityLabel={[item.name, statusLabel, primary]
          .filter(Boolean)
          .join(", ")}
        onPress={() => {
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
        <BrandLogo name={item.name} brandDomain={item.brandDomain} size={38} />

        <View style={styles.middle}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {formatDaysUntil(daysUntil(date), date)}
          </Text>
        </View>

        <View style={styles.amounts}>
          <Text
            style={styles.amount}
            numberOfLines={1}
            maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
          >
            {primary}
          </Text>
          {charged ? (
            <Text
              style={styles.charged}
              numberOfLines={1}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {charged}
            </Text>
          ) : null}
        </View>
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
    height: ROW_HEIGHT,
    marginBottom: ROW_GAP,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderRadius: RADIUS,
    paddingHorizontal: 10,
  },
  middle: { flex: 1, minWidth: 0 },
  // No status badge: the row's own fill carries it, which buys the name the full
  // width back on exactly the rows whose names tend to be longest.
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  sub: { marginTop: 2, fontSize: 12.5, color: colors.muted },
  amounts: { alignItems: "flex-end" },
  amount: {
    fontSize: 15.5,
    fontWeight: "700",
    color: colors.text,
    // Digits stop jittering between rows and during optimistic updates.
    fontVariant: ["tabular-nums"],
  },
  charged: {
    marginTop: 1,
    fontSize: 11.5,
    color: colors.muted,
    fontVariant: ["tabular-nums"],
  },
  // Laid out left-to-right here; the library's wrapper pins the group to the
  // trailing edge, so the destructive action ends up furthest out, as in Mail.
  actions: {
    flexDirection: "row",
    alignItems: "center",
    height: ROW_HEIGHT,
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
