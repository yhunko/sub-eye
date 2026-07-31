import { SymbolView } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { colors } from "@/shared/ui/theme";

/**
 * What a finished subscription shows under its banner.
 *
 * There is genuinely nothing to report about one — `createdAt` is when the row
 * was typed into SubEye rather than when the subscription began, so there is no
 * honest lifetime total, no real duration and no "you saved X". What there IS,
 * is one thing the user can do, and it was previously buried behind a glyph in
 * the nav bar with an empty screen under it.
 *
 * ponytail: one sentence and the button. The banner above already says which
 * subscription this is, when it ended and what it cost — none of that is
 * repeated here.
 */
export function EndedEmpty({ onRenew }: { onRenew: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <SymbolView
          name={{ ios: "arrow.clockwise", android: "refresh" }}
          size={26}
          tintColor={colors.accent}
          weight="regular"
        />
      </View>
      <Text style={styles.body}>{m.detail_endedBody()}</Text>
      <View style={styles.action}>
        <Button label={m.action_restart()} onPress={onRenew} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 40, paddingHorizontal: 8, gap: 18 },
  mark: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Uncapped Dynamic Type: prose, and nothing below it depends on its height.
  body: {
    maxWidth: 280,
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: "center",
    color: colors.muted,
  },
  action: { alignSelf: "stretch", paddingHorizontal: 24 },
});
