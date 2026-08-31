import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { colors } from "@/shared/ui/theme";

const STEPS = [1, 2, 3];

// iOS gives these screens a transparent glass nav bar, so their content starts
// at y=0 and anything PINNED above the scroller has to pay the bar's height
// itself. `@react-navigation/elements` is not in this tree, so there is no
// `useHeaderHeight` to ask; 44 is the standard bar under a small title, the
// same number the detail hero climbs back out of its inset with.
const NAV_BAR_HEIGHT = 44;

/**
 * The frame a step's scroller and its footer sit in.
 *
 * It exists for the keyboard: a native stack moves nothing out of its way, so
 * the one control that has to stay reachable — the button that finishes the
 * step — is the one it lands on top of.
 */
export function StepScreen({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      // Android resizes the window itself (`adjustResize`); asking for it twice
      // pads the view by the keyboard a second time.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

/**
 * Where you are in the three steps.
 *
 * Pinned above the scroller rather than scrolling with it: step one is a long
 * brand list that owns its own scrolling, and an indicator that leaves the
 * screen on the first flick tells you nothing on the screen where it matters
 * most.
 */
export function StepHeading({ step, title }: { step: number; title: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.heading,
        // Android's header is opaque, so the navigator already lays content out
        // below it and paying for it again would double the gap.
        Platform.OS === "ios"
          ? { paddingTop: insets.top + NAV_BAR_HEIGHT }
          : null,
      ]}
    >
      <View style={styles.track}>
        {STEPS.map((index) => (
          <View
            key={index}
            style={[styles.segment, index <= step && styles.segmentDone]}
          />
        ))}
      </View>
      <Text style={styles.caption}>
        {`${m.form_stepOf({ step, total: STEPS.length })} · ${title}`}
      </Text>
    </View>
  );
}

/**
 * The step's one commit action, pinned above the home indicator.
 *
 * This is where Save moved to. It used to be a 17pt checkmark in the nav bar —
 * the one control on a form that a thumb cannot reach, on a screen whose whole
 * point is that it is short enough to finish in one go.
 */
export function StepFooter({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.footer}>
      <Button label={label} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  heading: { paddingHorizontal: 20, paddingBottom: 16 },
  track: { flexDirection: "row", gap: 6, marginBottom: 8 },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  segmentDone: { backgroundColor: colors.accent },
  caption: { fontSize: 13, color: colors.muted },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
