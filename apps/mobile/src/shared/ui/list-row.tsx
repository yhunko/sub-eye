import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { colors } from "./theme";
import { useLargeText } from "./use-large-text";

/**
 * The inset-grouped list iOS Settings is built from: a rounded card of rows, an
 * uppercase heading above it and a footnote below.
 *
 * In `shared/ui` because Settings and Notifications are two different widgets,
 * and a widget reaching into another widget's `ui/` is a cross-import that
 * `check:boundaries` fails the build on.
 *
 * `Section` owns the heading AND the footnote for a reason: they belong to the
 * card, not to the page. Laying them out as siblings under a `gap` puts the same
 * space between a card and its own caption as between two unrelated sections,
 * which is what made the first version read as one long column of loose text.
 */

// Row padding (16) + icon (19) + gap (12), so the rule starts under the label
// rather than under the icon.
const DIVIDER_INSET = 47;

/** UIKit's minimum touch target, and the height of a plain Settings cell. */
const ROW_HEIGHT = 44;

export const Divider = () => <View style={styles.divider} />;

export function Section({
  title,
  footnote,
  children,
}: {
  title?: string;
  footnote?: string;
  children: ReactNode;
}) {
  return (
    <View>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </View>
  );
}

/** A caption that belongs to the screen rather than to any one section. */
export function PageFootnote({ children }: { children: ReactNode }) {
  return <Text style={styles.footnote}>{children}</Text>;
}

/**
 * The leading slot: a platform symbol, or an arbitrary element that takes its
 * place. Either/or, never both — `leading` exists for the account row's avatar,
 * which is the one thing in a settings list that is not an icon.
 */
type RowLeading =
  | { ios: SFSymbol; android: AndroidSymbol; leading?: never }
  | { ios?: never; android?: never; leading: ReactNode };

export function Row({
  ios,
  android,
  leading,
  label,
  subtitle,
  value,
  onPress,
  accent,
  destructive,
  toggle,
  accessory,
}: RowLeading & {
  label: string;
  /** The second line of a `.subtitle` cell — detail, never the control's state. */
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  /** Tints the row as an action rather than a destination. */
  accent?: boolean;
  /**
   * The same idea as `accent`, in red: an action that destroys something. Wins
   * over `accent` if both are passed, because the warning is the load-bearing
   * half — but passing both is a caller error, not a supported combination.
   */
  destructive?: boolean;
  toggle?: {
    value: boolean;
    disabled: boolean;
    onValueChange: (next: boolean) => void;
  };
  /**
   * An arbitrary trailing control — a checkmark, a time picker. Replaces the
   * chevron, so a row that both navigates and displays a control does not
   * promise a screen it will not push.
   */
  accessory?: ReactNode;
}) {
  // At the accessibility sizes the label and its value have no chance of
  // sharing a line, so the value drops into the label's column — which is what
  // iOS Settings itself does rather than truncating either one.
  const stacked = useLargeText();

  const content = (
    <>
      {/* The union guarantees one branch or the other, but destructuring a
          union loses that narrowing — hence the pair check rather than a cast. */}
      {leading ??
        (ios && android ? (
          <SymbolView
            name={{ ios, android }}
            size={19}
            tintColor={
              destructive
                ? colors.danger
                : accent
                  ? colors.accent
                  : colors.muted
            }
            weight="regular"
          />
        ) : null)}
      <View style={styles.middle}>
        <Text
          style={[
            styles.label,
            accent && styles.labelAccent,
            destructive && styles.labelDestructive,
          ]}
          // Unbounded, not one line. A label that fits in English is not a label
          // that fits — "Trial ending reminders" is half again as long in
          // Ukrainian and was truncating into the switch, and at the
          // accessibility text sizes even two lines runs out. Wrapping is what
          // UIKit does, and the row is padding + minHeight so it can follow.
        >
          {label}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {value && stacked ? (
          <Text style={[styles.value, styles.valueStacked]}>{value}</Text>
        ) : null}
      </View>
      {value && !stacked ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {toggle ? (
        // The platform control, deliberately: the design's toggle IS a stock
        // iOS switch, and Android gets Material 3 for free. It carries the row's
        // label for VoiceOver, because the wrapper below is not accessible —
        // the switch IS the control.
        <Switch
          accessibilityLabel={label}
          style={styles.toggle}
          value={toggle.value}
          disabled={toggle.disabled}
          onValueChange={toggle.onValueChange}
          trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
        />
      ) : null}
      {accessory}
      {/* `accent` marks a row that DOES something rather than going somewhere,
          and UIKit gives those no chevron — the same reason ActionButton has
          none. Restore, Open device settings and Send a test all read as
          navigation until this. */}
      {onPress && !accent && !destructive && !toggle && !accessory ? (
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={13}
          tintColor={colors.muted}
          weight="semibold"
        />
      ) : null}
    </>
  );

  // A row with nothing to press is a plain View, NOT a disabled Pressable.
  // `Pressability` returns `!disabled` from `onStartShouldSetResponder`, so a
  // disabled Pressable should let touches through to its children — and yet a
  // Switch nested in one never receives them. Not worth chasing: a row that
  // does not respond to a press has no business being a press target.
  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        [label, subtitle, value].filter(Boolean).join(", ") || label
      }
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

/** The trailing checkmark iOS uses for a chosen row in a multi-select list. */
export function RowCheck({ checked }: { checked: boolean }) {
  if (!checked) return null;

  return (
    <SymbolView
      name={{ ios: "checkmark", android: "check" }}
      size={15}
      tintColor={colors.accent}
      weight="semibold"
    />
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    overflow: "hidden",
  },
  footnote: {
    fontSize: 12.5,
    lineHeight: 16.5,
    color: colors.muted,
    paddingHorizontal: 16,
    marginTop: 6,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    // Padding plus a floor rather than a fixed height: a wrapped label or a
    // subtitle grows the row instead of overflowing it.
    paddingVertical: 8,
    minHeight: ROW_HEIGHT,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: DIVIDER_INSET,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  // Not decoration: RN's iOS Switch hardcodes `alignSelf: "flex-start"` under
  // the caller's style (Libraries/Components/Switch/Switch.js). The cross axis
  // of a row is vertical, so that pins the switch to the row's TOP and beats the
  // parent's alignItems — it sat 12pt above the label until this line.
  toggle: { alignSelf: "center" },
  middle: { flex: 1, minWidth: 0 },
  label: { fontSize: 16, color: colors.text },
  labelAccent: { color: colors.accent, fontWeight: "600" },
  labelDestructive: { color: colors.danger, fontWeight: "600" },
  subtitle: { fontSize: 12.5, color: colors.muted, marginTop: 1 },
  value: { fontSize: 16, color: colors.muted, flexShrink: 1 },
  // Under the label rather than beside it. `flexShrink` above is for the row it
  // no longer sits in; here it would shrink the text against the column.
  valueStacked: { marginTop: 2, flexShrink: 0 },
});
