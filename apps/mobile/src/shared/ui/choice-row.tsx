import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

/** The trailing glyph of a row that goes somewhere. */
export function Chevron() {
  return (
    <SymbolView
      name={{ ios: "chevron.right", android: "chevron_right" }}
      size={13}
      tintColor={colors.muted}
      weight="semibold"
    />
  );
}

/**
 * A standalone card row: a title, one line saying what it does, and either a
 * radio (`selected` given) or an arbitrary trailing element.
 *
 * It is not `list-row`'s `Row`, which is an inset-grouped Settings cell inside
 * a shared card. These are separate cards with air between them, because each
 * one carries a sentence of its own rather than a value.
 *
 * A choice that cannot be taken stays on screen, dimmed, with `subtitle` saying
 * why — an option that disappears reads as a bug.
 */
export function ChoiceRow({
  title,
  subtitle,
  badge,
  icon,
  selected,
  disabled,
  trailing,
  onPress,
}: {
  title: string;
  subtitle?: string;
  /** An uppercase tag above the title ("Scheduled"). */
  badge?: string;
  /**
   * A platform symbol in the leading slot, for a row that ACTS rather than
   * chooses. Ignored when `selected` is given — the radio owns that slot, and a
   * row cannot be both a choice and a destination.
   */
  icon?: { ios: SFSymbol; android: AndroidSymbol };
  selected?: boolean;
  disabled?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const active = selected === true;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: selected ?? false, disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        active && styles.rowSelected,
        disabled && styles.rowDisabled,
        pressed && !active && !disabled ? styles.rowPressed : null,
      ]}
    >
      {selected === undefined ? (
        icon ? (
          <View style={styles.icon}>
            <SymbolView
              name={icon}
              size={17}
              tintColor={colors.muted}
              weight="medium"
            />
          </View>
        ) : null
      ) : (
        <View style={[styles.radio, active && styles.radioOn]}>
          {active ? (
            <SymbolView
              name={{ ios: "checkmark", android: "check" }}
              size={11}
              tintColor={colors.bg}
              weight="heavy"
            />
          ) : null}
        </View>
      )}
      <View style={styles.text}>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        <Text style={[styles.title, active && styles.titleSelected]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowDisabled: { opacity: 0.4 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1.6,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  text: { flex: 1, minWidth: 0 },
  badge: {
    alignSelf: "flex-start",
    marginBottom: 6,
    overflow: "hidden",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  title: { fontSize: 16, color: colors.text },
  titleSelected: { fontWeight: "600", color: colors.accent },
  subtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.muted,
  },
});
