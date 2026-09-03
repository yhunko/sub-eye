import { Host, HStack, Image, Menu, Picker, Text } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  pickerStyle,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import type { SubscriptionPeriod } from "@subeye/model";
import { StyleSheet, useWindowDimensions } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";
import type { CycleKey } from "../model/cadence";

/**
 * The real UIKit controls, hosted in SwiftUI.
 *
 * `@expo/ui` is not a new native dependency: `expo-router` already depends on
 * it, and `ExpoUI` is already in `ios/Podfile.lock`, so the pod is in the build
 * this app is running. It is declared in `package.json` anyway, because reaching
 * into a transitive dependency is a thing that quietly disappears on an upgrade.
 *
 * Android is `cadence-picker.tsx`; SwiftUI does not cross over, and neither
 * does the idiom.
 */

/** The custom pair, as a menu tag — a tag is a string, so it needs a name. */
export const CUSTOM_TAG = "custom";

/** A preset, or the custom pair. What the menu actually selects between. */
export type CycleChoice = CycleKey | typeof CUSTOM_TAG;

/**
 * The cadence control: a real `UIMenu`, over a label this component DRAWS.
 *
 * **The thing that opens the menu is the thing you were reading, and that is
 * the whole design.** iOS 26 morphs a menu out of its anchor and contracts it
 * back on dismiss. An earlier version anchored to a transparent SwiftUI shape
 * laid OVER an RN label, so the glass played across text that never took part
 * in it: the value changed, then a ghost wobbled over it. No `buttonStyle`
 * reaches that — it is the presentation, not the button's chrome.
 *
 * **The label is hand-built rather than `Picker(.menu)` because the system
 * insets its own.** A `.menu` picker is the shorter spelling and it does morph
 * correctly, but it holds its value ~13pt in from its trailing edge, and
 * `@expo/ui` exposes no `menuIndicator` or `contentMargins` to take that back —
 * so the one row in the card that could not reach the value column was this
 * one. Owning the `HStack` means our trailing edge IS the button's, and the
 * type and the glyph are the card's own: 16pt against the label beside it, and
 * the same 12pt semibold `chevron.up.chevron.down` the currency chip wears.
 *
 * **Nothing is measured.** That is what the three revisions before this got
 * wrong — not hosting the text, but sizing the host TO the text. Width is the
 * row's free space, which `FormRow` hands every control it holds and which is
 * wider than any cadence in any locale, so a longer value grows leftwards into
 * slack instead of clipping. Height is a floor, and a floor cannot clip.
 */
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

  // SwiftUI text does not follow Dynamic Type unless it is given a `textStyle`,
  // and the only text styles are Apple's own sizes — `body` is 17pt, one point
  // off every label in this card. Scaling 16 by hand is what RN's own
  // `allowFontScaling` does to the label beside it, so the two stay the same
  // size at every setting rather than agreeing only at the default.
  const { fontScale } = useWindowDimensions();
  // A `Host` has no size of its own, and height is the one dimension the row
  // cannot give it: `rowControl` is sized BY its children, so asking to stretch
  // inside it is circular and collapses to nothing. Uncapped, unlike the wheels
  // below — a line of text has to keep pace with the label it sits next to.
  const minHeight = Math.round(22 * fontScale);

  // The control drops under the label at the accessibility sizes, where the
  // trailing edge it was aligning to is no longer the one that matters. Same
  // call `TextRow` makes with `textAlign`.
  const stacked = useLargeText();

  return (
    <Host style={[styles.trigger, { minHeight }]} colorScheme="dark">
      <Menu
        label={
          <HStack spacing={5}>
            <Text
              modifiers={[
                font({ size: Math.round(16 * fontScale) }),
                // Primary, not muted: this row CHANGES a value where it
                // stands, the same call the currency chip makes. The chevron
                // stays muted — it is chrome, not the answer.
                foregroundStyle(colors.text),
              ]}
            >
              {current?.label ?? ""}
            </Text>
            <Image
              systemName="chevron.up.chevron.down"
              color={colors.muted}
              modifiers={[
                font({ size: Math.round(12 * fontScale), weight: "semibold" }),
              ]}
            />
          </HStack>
        }
        modifiers={[
          // No chrome, so the label's own frame is the button's: nothing is
          // inset and nothing is guessed back.
          buttonStyle("plain"),
          // The host is the whole control slot, so the button has to be told
          // where to sit in it. 10000 stands in for SwiftUI's `.infinity`,
          // which this modifier takes as a number — inside a bounded host the
          // two are the same thing.
          frame({
            maxWidth: 10000,
            maxHeight: 10000,
            alignment: stacked ? "leading" : "trailing",
          }),
          accessibilityLabel(`${m.form_cycle()}, ${current?.label ?? ""}`),
        ]}
      >
        {/* Inline INSIDE a menu is what puts a checkmark against the current
            value — the whole reason this is a picker and not a list of
            buttons. */}
        <Picker
          selection={value}
          onSelectionChange={(next) => onChange(next as CycleChoice)}
          modifiers={[pickerStyle("inline")]}
        >
          {options.map((option) => (
            <Text key={option.key} modifiers={[tag(option.key)]}>
              {option.label}
            </Text>
          ))}
        </Picker>
      </Menu>
    </Host>
  );
}

/**
 * Two real `UIPickerView`s, with the barrel and the detent haptic no JS can
 * fake. This one IS the SwiftUI content rather than a label under it, so hosting
 * is the right shape here — and the frame is still Yoga's, for the reason above.
 */
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
  // A wheel's height is the control's, not text's, so it does not grow with
  // Dynamic Type on its own — UIKit shrinks the rows instead. Scaling the host
  // is what keeps the labels readable at the accessibility sizes, and it is
  // capped because past double the wheels are taller than the form.
  const { fontScale } = useWindowDimensions();
  const height = Math.round(180 * Math.min(fontScale, 2));

  return (
    <Host colorScheme="dark" style={[styles.wheelHost, { height }]}>
      <HStack spacing={0}>
        <Picker
          selection={every}
          onSelectionChange={(next) => onEveryChange(Number(next))}
          modifiers={[pickerStyle("wheel")]}
        >
          {counts.map((count) => (
            <Text key={count} modifiers={[tag(count)]}>
              {String(count)}
            </Text>
          ))}
        </Picker>
        <Picker
          selection={period}
          onSelectionChange={(next) =>
            onPeriodChange(next as SubscriptionPeriod)
          }
          modifiers={[pickerStyle("wheel")]}
        >
          {units.map((unit) => (
            <Text key={unit.value} modifiers={[tag(unit.value)]}>
              {unit.label}
            </Text>
          ))}
        </Picker>
      </HStack>
    </Host>
  );
}

const styles = StyleSheet.create({
  // The row's free space, exactly as `FormRow` gives it to every other control.
  // No trailing padding: the row's own 16 is what puts a value on the card's
  // right-hand column.
  trigger: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  // A `Host` has NO intrinsic size, so it needs BOTH dimensions from Yoga.
  // `alignSelf: "stretch"` was the first version and set the cross axis only —
  // down a row that is the vertical one, so the host was 180pt tall and 0 wide,
  // and SwiftUI laid the wheels out into nothing. The row looked empty.
  wheelHost: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
});
