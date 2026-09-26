import { type ReactNode, useCallback, useEffect, useRef } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { colors } from "./theme";

// A row of a UIPickerView, and the number this is tuned against. It scales with
// Dynamic Type because a wheel needs a UNIFORM item height to snap to, and a
// fixed one is the "height on a box that holds text" that caps the label.
const ITEM_HEIGHT = 36;

const itemHeight = (fontScale: number) => Math.round(ITEM_HEIGHT * fontScale);

// Five rows at the ordinary sizes, three once each of them is half again as
// tall — at the largest accessibility size five is most of the screen.
const visibleRows = (fontScale: number) => (fontScale >= 1.4 ? 3 : 5);

/**
 * The frame a set of `Wheel` columns turn inside.
 *
 * The selection band is drawn HERE, once, spanning every column — that is what
 * a `UIPickerView` looks like, and it is the difference between one control
 * with two parts and two controls that happen to be adjacent. Per-column bands
 * were the first version and read as the latter.
 */
export function WheelGroup({ children }: { children: ReactNode }) {
  const { fontScale } = useWindowDimensions();
  const item = itemHeight(fontScale);
  const pad = item * ((visibleRows(fontScale) - 1) / 2);

  return (
    <View style={styles.group}>
      <View
        pointerEvents="none"
        style={[styles.band, { height: item, top: pad }]}
      />
      {children}
    </View>
  );
}

/**
 * One column of a wheel picker.
 *
 * This is not a `UIPickerView` — there is no picker in this tree and adding one
 * means a native module, a prebuild and a fresh dev client for a control the
 * form uses in one place. A `ScrollView` with `snapToInterval` under the
 * group's static band is the same interaction: the values scroll through a
 * fixed window, the one in the window is the value, and letting go snaps.
 *
 * What it does NOT reproduce is the barrel's perspective and the detent haptic.
 * If either turns out to matter, `@react-native-picker/picker` is the swap.
 *
 * VoiceOver gets an `adjustable`, which is what UIKit exposes a picker column
 * as — a scroll view of sixty numbers is unusable through a screen reader, and
 * the items stay tappable so a single value is one hit rather than a flick.
 */
export function Wheel<T extends string | number>({
  options,
  value,
  label,
  onChange,
  accessibilityLabel,
}: {
  options: readonly T[];
  value: T;
  label: (option: T) => string;
  onChange: (option: T) => void;
  accessibilityLabel: string;
}) {
  const scroller = useRef<ScrollView>(null);
  // What the wheel is actually showing. Compared against before any programmatic
  // scroll, so following the value never fights a finger mid-drag.
  const offset = useRef(0);
  const { fontScale } = useWindowDimensions();

  const item = itemHeight(fontScale);
  const pad = item * ((visibleRows(fontScale) - 1) / 2);

  // -1 when the form holds a value this column does not offer. Clamped rather
  // than corrected: the row above still states the real cadence, and silently
  // rewriting a user's number because a wheel cannot show it is worse than a
  // wheel that starts at the top.
  const index = Math.max(0, options.indexOf(value));
  const initial = useRef(index * item);

  const commit = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const picked =
      options[
        Math.min(
          options.length - 1,
          Math.max(0, Math.round(event.nativeEvent.contentOffset.y / item)),
        )
      ];
    if (picked !== undefined && picked !== value) onChange(picked);
  };

  // Follow the value when something ELSE moves it — a preset, a reseed. Skipped
  // when the wheel is already there, which is the case immediately after the
  // user's own scroll settled on it: scrolling then cuts the snap short. It
  // closes over refs alone, so the effect below runs on the index it is handed
  // rather than on every render.
  const syncTo = useCallback((target: number) => {
    if (Math.abs(offset.current - target) < 1) return;
    scroller.current?.scrollTo({ y: target, animated: false });
  }, []);

  useEffect(() => {
    syncTo(index * item);
  }, [index, item, syncTo]);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: label(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => {
        const step = event.nativeEvent.actionName === "increment" ? 1 : -1;
        const next = options[index + step];
        if (next !== undefined) onChange(next);
      }}
      style={[styles.column, { height: item * visibleRows(fontScale) }]}
    >
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        snapToInterval={item}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: pad }}
        // FROZEN at the first render, not `index * item`. Live, it would apply
        // the new offset natively the instant a drag committed a value — with
        // none of `syncTo`'s guard, so a slow drag's snap was cut short by the
        // very pick that made it. iOS honours it on the first layout; Android
        // ignores it, which is what `onLayout` is for.
        contentOffset={{ x: 0, y: initial.current }}
        onLayout={() => syncTo(index * item)}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
        }}
        // BOTH, not just momentum: a slow drag released without a flick never
        // produces momentum, so `onMomentumScrollEnd` alone loses that pick.
        onScrollEndDrag={commit}
        onMomentumScrollEnd={commit}
      >
        {options.map((option, position) => (
          <Pressable
            key={option}
            // Not a11y-visible: the column above is the control. A tap is here
            // for the pointer, which has no flick.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onPress={() => onChange(option)}
            style={[styles.item, { height: item }]}
          >
            <Text
              style={[
                styles.label,
                position === index ? styles.labelSelected : null,
              ]}
              numberOfLines={1}
            >
              {label(option)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: "row",
  },
  // The selection window, drawn UNDER the values and never moving — the same
  // way a picker marks its detent. The text scrolls through it.
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  column: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  item: { alignItems: "center", justifyContent: "center" },
  // Neighbours are legible rather than decorative: a wheel you cannot read one
  // step ahead of is a wheel you have to overshoot to use.
  label: { fontSize: 18, color: colors.muted, opacity: 0.5 },
  labelSelected: { color: colors.text, opacity: 1, fontWeight: "500" },
});
