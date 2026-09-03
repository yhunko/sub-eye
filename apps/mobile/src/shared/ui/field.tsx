import { SymbolView } from "expo-symbols";
import { Children, Fragment, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { Chevron } from "./choice-row";
import { Divider, ROW_INSET, Section } from "./list-row";
import { colors } from "./theme";
import { useLargeText } from "./use-large-text";

/**
 * TWO SHAPES LIVE HERE, and which one a screen wants is a layout question.
 *
 * `Field` puts the label ABOVE a full-width control. That is the shape for a
 * sheet: pause, renew and manage-pricing each ask one or two questions with a
 * sentence of context, and a full-width box is where a sentence goes. Its
 * `TextField`/`ValueField` siblings are gone — the subscription form was their
 * only caller.
 *
 * `FormSection`/`FormRow`/`TextRow`/`ValueRow` put the label on the LEFT and
 * the control on the right, inside the same inset-grouped card `list-row`
 * draws for Settings. That is the shape UIKit's own forms use, and it is what
 * the subscription form is: a dozen short answers in a row, where a full-width
 * box per answer makes a price field as wide as the screen for four digits.
 */

/** A labelled row with an optional inline error. Both form sheets are built from it. */
export function Field({
  label,
  error,
  hint,
  accessory,
  gap,
  children,
}: {
  label: string;
  error?: string;
  /** Explanatory copy under the control — sits below the error when both show. */
  hint?: string;
  /** Trailing element on the label row ("Forgot?", "Optional"). */
  accessory?: ReactNode;
  /** Bottom spacing. The auth screens space fields with a flex gap instead. */
  gap?: number;
  children: ReactNode;
}) {
  return (
    <View
      style={[styles.field, gap === undefined ? null : { marginBottom: gap }]}
    >
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {accessory}
      </View>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/**
 * A card of `FormRow`s, hairline-separated.
 *
 * The rules are drawn HERE rather than by the caller because a row that only
 * sometimes exists — the offer price, the custom cadence — would otherwise
 * leave a rule with nothing under it. `Children.toArray` drops the nulls a
 * conditional row renders, so the separators follow what is actually on screen.
 */
export function FormSection({
  title,
  footnote,
  children,
}: {
  title?: string;
  footnote?: string;
  children: ReactNode;
}) {
  const rows = Children.toArray(children);

  return (
    // This animates the SECTION'S OWN frame, which is what makes a section slide
    // when a card above it grows — the cadence wheels opening, the offer rows
    // arriving. It does NOT animate the card's height: a layout animation only
    // ever moves the view that carries it, so `Section` puts one on the card
    // too. Same duration in both places, or the two halves drift apart.
    <Animated.View
      style={styles.section}
      layout={LinearTransition.duration(220)}
    >
      <Section title={title} footnote={footnote}>
        {rows.map((row, index) => (
          // `toArray` assigns every child a stable key of its own; the index is
          // only ever read to decide whether a rule goes above this one.
          <Fragment key={(row as { key?: string }).key ?? index}>
            {index > 0 ? <Divider inset={ROW_INSET} /> : null}
            {row}
          </Fragment>
        ))}
      </Section>
    </Animated.View>
  );
}

/**
 * One row of a `FormSection`: the label on the left, the control on the right.
 *
 * The control keeps the row's free space (`flexBasis: 0` + grow) and the label
 * takes what it needs, which is what lets a four-digit price sit in a field the
 * width of a price rather than the width of the screen.
 *
 * An error goes UNDER the row, full width and inside the card, because beside a
 * control that is already at the right edge there is nowhere for it to go.
 */
export function FormRow({
  label,
  subtitle,
  error,
  onPress,
  chevron,
  accessibilityLabel,
  children,
}: {
  label: string;
  /** A second line under the label — "in 31 days", never the control's state. */
  subtitle?: string;
  error?: string;
  onPress?: () => void;
  /**
   * What VoiceOver reads for a pressable row. A `Pressable` with a label is a
   * LEAF, so its children stop being read — the row would otherwise announce
   * "Category" and never the category.
   */
  accessibilityLabel?: string;
  /**
   * The trailing glyph. `push` goes to a screen; `menu` opens a choice in
   * place, and wears UIKit's own up/down pair for a pop-up button.
   */
  chevron?: "push" | "menu";
  children?: ReactNode;
}) {
  // At the accessibility sizes a label and its control have no chance of
  // sharing a line at any phone width, so the control drops under the label
  // rather than either one shrinking into an ellipsis.
  const stacked = useLargeText();

  const content = (
    <>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.rowControl, stacked && styles.rowControlStacked]}>
        {children}
        {chevron === "menu" ? (
          <SymbolView
            name={{ ios: "chevron.up.chevron.down", android: "unfold_more" }}
            size={12}
            tintColor={colors.muted}
            weight="semibold"
          />
        ) : chevron === "push" ? (
          <Chevron />
        ) : null}
      </View>
    </>
  );

  return (
    <View>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          onPress={onPress}
          style={({ pressed }) => [
            styles.row,
            stacked && styles.rowStacked,
            pressed && styles.rowPressed,
          ]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={[styles.row, stacked && styles.rowStacked]}>
          {content}
        </View>
      )}
      {error ? <Text style={styles.rowError}>{error}</Text> : null}
    </View>
  );
}

/** A `FormRow` whose control is the text field itself, typed into in place. */
export function TextRow({
  label,
  value,
  onChangeText,
  error,
  trailing,
  ...input
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  /**
   * A second control sharing the field's row, the way a native amount field
   * carries its unit — the price row's currency, and nothing else so far.
   */
  trailing?: ReactNode;
} & Pick<
  TextInputProps,
  "keyboardType" | "placeholder" | "autoCapitalize" | "autoFocus"
>) {
  const stacked = useLargeText();

  return (
    <FormRow label={label} error={error}>
      <TextInput
        style={[styles.rowInput, stacked && styles.rowInputStacked]}
        value={value}
        onChangeText={onChangeText}
        // The field is one line of text in a 56pt row, so without this the
        // caret only answers a tap that lands on the digits themselves. The
        // slop reaches out to the row's own padding, which is what makes the
        // whole height of the row focus it.
        hitSlop={{ top: 12, bottom: 12 }}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        // Right up against the row's edge when it shares a line with the label,
        // and back to the label's own column once it drops below it.
        textAlign={stacked ? "left" : "right"}
        // The app is dark-only, so the OS keyboard has to be told as well — it
        // defaults to the light one and flashes white over a near-black form.
        keyboardAppearance="dark"
        {...input}
      />
      {trailing}
    </FormRow>
  );
}

/** A `FormRow` that DISPLAYS a value and goes somewhere else to change it. */
export function ValueRow({
  label,
  value,
  placeholder,
  subtitle,
  error,
  onPress,
  chevron = "push",
}: {
  label: string;
  value?: string;
  /** Shown, muted, when there is no value. */
  placeholder?: string;
  subtitle?: string;
  error?: string;
  onPress?: () => void;
  chevron?: "push" | "menu";
}) {
  const stacked = useLargeText();

  return (
    <FormRow
      label={label}
      subtitle={subtitle}
      error={error}
      onPress={onPress}
      chevron={onPress ? chevron : undefined}
      accessibilityLabel={[label, value ?? placeholder, subtitle]
        .filter(Boolean)
        .join(", ")}
    >
      <Text
        style={[styles.rowValue, value ? null : styles.rowValueMuted]}
        numberOfLines={stacked ? undefined : 1}
      >
        {value ?? placeholder}
      </Text>
    </FormRow>
  );
}

const styles = StyleSheet.create({
  // The card's own bottom spacing, so a form is a column of sections rather
  // than one run-on list. `Section` owns its heading and footnote already.
  section: { marginBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: ROW_INSET,
    // Padding plus a floor rather than a fixed height: a wrapped label or a
    // control taller than one line grows the row instead of overflowing it.
    // 56 is the settings cell's 44 plus the room a form asks for — these rows
    // hold controls rather than labels, and at 44 the whole card read as a
    // wall of text with nothing to touch.
    paddingVertical: 12,
    minHeight: 56,
  },
  rowStacked: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowText: { flexShrink: 1, minWidth: 0 },
  rowLabel: { fontSize: 16, color: colors.text },
  rowSubtitle: { marginTop: 3, fontSize: 13, color: colors.muted },
  // Basis 0 + grow, so the free space of the row lands here and a right-aligned
  // control sits against the card's edge. `rowControlStacked` puts the basis
  // back: down a column, basis 0 collapses the control to no height at all.
  rowControl: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  rowControlStacked: {
    flexGrow: 0,
    flexBasis: "auto",
    justifyContent: "flex-start",
  },
  rowInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    // Fills the row's content height rather than centring at the height of one
    // line — the difference between a 32pt target and a 20pt one. iOS centres a
    // single-line field's text in whatever box it is given.
    alignSelf: "stretch",
    fontSize: 16,
    color: colors.text,
    paddingVertical: 4,
  },
  rowInputStacked: { flexGrow: 0, flexBasis: "auto" },
  rowValue: { flexShrink: 1, fontSize: 16, color: colors.muted },
  rowValueMuted: { color: colors.muted, opacity: 0.7 },
  rowError: {
    paddingHorizontal: ROW_INSET,
    paddingBottom: 12,
    fontSize: 13,
    color: colors.danger,
  },
  field: { marginBottom: 16 },
  labelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  label: { marginBottom: 6, fontSize: 13, color: colors.muted },
  hint: { marginTop: 6, fontSize: 12.5, lineHeight: 17, color: colors.muted },
  error: { marginTop: 4, fontSize: 13, color: colors.danger },
});
