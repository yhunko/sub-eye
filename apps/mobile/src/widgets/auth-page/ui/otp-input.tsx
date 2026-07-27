import { useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// Named slots rather than a length: these are fixed positions that never
// reorder, so the position IS the identity and each box keeps a stable key.
const SLOTS = ["d1", "d2", "d3", "d4", "d5", "d6"] as const;
const LENGTH = SLOTS.length;
const DIGITS = /\d/g;

/**
 * Six boxes over ONE real input. The boxes are decoration; the hidden field is
 * what the OS fills from the keyboard suggestion bar — six separate inputs would
 * each be a different field to iOS and autofill would never offer the code.
 */
export function OtpInput({
  value,
  onChangeText,
  autoFocus = true,
}: {
  value: string;
  onChangeText: (value: string) => void;
  autoFocus?: boolean;
}) {
  const field = useRef<TextInput>(null);
  const digits = value.split("");

  return (
    <Pressable
      accessibilityRole="none"
      onPress={() => field.current?.focus()}
      style={styles.row}
    >
      {SLOTS.map((slot, index) => {
        const active = index === Math.min(value.length, LENGTH - 1);
        return (
          <View
            key={slot}
            style={[styles.box, active ? styles.boxActive : null]}
          >
            {digits[index] ? (
              <Text
                maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
                style={styles.digit}
              >
                {digits[index]}
              </Text>
            ) : active ? (
              <View style={styles.caret} />
            ) : null}
          </View>
        );
      })}
      <TextInput
        ref={field}
        value={value}
        // Strip everything but digits: the SMS/email autofill hands over the
        // whole suggestion, which on some keyboards carries surrounding text.
        onChangeText={(next) =>
          onChangeText((next.match(DIGITS) ?? []).join("").slice(0, LENGTH))
        }
        style={styles.hidden}
        keyboardType="number-pad"
        keyboardAppearance="dark"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        caretHidden
        maxLength={LENGTH}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  box: {
    flex: 1,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  boxActive: { borderColor: colors.accentBright },
  digit: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  caret: { width: 2, height: 26, backgroundColor: colors.accentBright },
  // Covers the row so a tap anywhere focuses it; invisible but not
  // display:none — a hidden input is not focusable and never receives autofill.
  hidden: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
});
