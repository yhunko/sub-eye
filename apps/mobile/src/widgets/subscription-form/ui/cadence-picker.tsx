import type { SubscriptionPeriod } from "@subeye/model";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { presentChoice } from "@/shared/ui/present-choice";
import { colors } from "@/shared/ui/theme";
import { Wheel, WheelGroup } from "@/shared/ui/wheel";
import type { CycleKey } from "../model/cadence";

/**
 * The cadence controls everywhere iOS is not.
 *
 * iOS has `cadence-picker.ios.tsx`, which hosts the real `Picker(.menu)` and
 * `Picker(.wheel)` from `@expo/ui/swift-ui`. **THE PLATFORM SUFFIX IS LOAD
 * BEARING, not a style choice**: that module calls `requireNativeView` at
 * MODULE SCOPE, so merely importing it on Android throws before any
 * `Platform.OS` branch could run. Metro drops a `.ios.tsx` from the Android
 * bundle entirely, which a runtime branch cannot do.
 *
 * The cost of the suffix is that TypeScript resolves the import to THIS file,
 * so these signatures are the contract and the iOS one is only checked against
 * itself. Change a prop here and change it there in the same commit.
 *
 * This is the first platform-suffixed pair in the app. Adding a second means
 * asking first whether a runtime branch would do — it usually would.
 */

/** `null` means the custom pair — a tag has to be a string, so it needs a name. */
export const CUSTOM_TAG = "custom";

/** A preset, or the custom pair. What the menu actually selects between. */
export type CycleChoice = CycleKey | typeof CUSTOM_TAG;

export function CyclePicker({
  options,
  value,
  onChange,
}: {
  options: readonly { key: CycleChoice; label: string }[];
  /** The selected preset, or `CUSTOM_TAG`. */
  value: CycleChoice;
  onChange: (next: CycleChoice) => void;
}) {
  const current = options.find((option) => option.key === value);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${m.form_cycle()}, ${current?.label ?? ""}`}
      onPress={() =>
        presentChoice(
          m.form_cycle(),
          undefined,
          options.map((option) => ({
            label: option.label,
            onPress: () => onChange(option.key),
          })),
        )
      }
      // Asymmetric, and the left edge is the point: a uniform slop reached 8pt
      // back over the amount's right-hand digits, so tapping the number opened
      // the currency picker instead of the keyboard.
      hitSlop={{ top: 10, bottom: 10, right: 10, left: 0 }}
      style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
    >
      <Text style={styles.value} numberOfLines={1}>
        {current?.label}
      </Text>
      <SymbolView
        name={{ ios: "chevron.up.chevron.down", android: "unfold_more" }}
        size={12}
        tintColor={colors.muted}
        weight="semibold"
      />
    </Pressable>
  );
}

export function CustomCadencePicker({
  counts,
  every,
  onEveryChange,
  units,
  period,
  onPeriodChange,
}: {
  counts: readonly number[];
  every: number;
  onEveryChange: (next: number) => void;
  units: readonly { value: SubscriptionPeriod; label: string }[];
  period: SubscriptionPeriod;
  onPeriodChange: (next: SubscriptionPeriod) => void;
}) {
  const unitLabels = new Map(units.map((unit) => [unit.value, unit.label]));

  return (
    <View style={styles.wheels}>
      <WheelGroup>
        <Wheel
          options={counts}
          value={every}
          label={String}
          onChange={onEveryChange}
          accessibilityLabel={m.form_every()}
        />
        <Wheel
          options={units.map((unit) => unit.value)}
          value={period}
          label={(unit) => unitLabels.get(unit) ?? unit}
          onChange={onPeriodChange}
          accessibilityLabel={m.form_cycle()}
        />
      </WheelGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    // NO trailing padding: the row's own 16 is what puts a value on the card's
    // right-hand column, and a control that adds its own sits that many points
    // short of every neighbour. `hitSlop` buys the touch target back instead.
    paddingLeft: 8,
    paddingVertical: 4,
    borderRadius: 8,
    // MARGIN, not padding: it separates this control from the field beside it
    // without handing the gap to this control's touch area, which is the whole
    // reason the amount was hard to hit.
    marginLeft: 8,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  value: { flexShrink: 1, fontSize: 16, color: colors.text },
  wheels: { alignSelf: "stretch", flexDirection: "row" },
});
