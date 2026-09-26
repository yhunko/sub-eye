import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { m } from "@/shared/i18n";
import {
  type Choice,
  type ChoiceRequest,
  setChoicePresenter,
} from "./present-choice";
import { colors } from "./theme";

/**
 * The Android half of `presentChoice`, mounted once at the root. Without it
 * `presentChoice` is a no-op on Android. iOS never reaches it — that platform
 * gets its own action sheet from the OS.
 *
 * NO cancel row: the scrim and the back button both dismiss, which is how every
 * Android sheet is left. iOS keeps a cancel button because an action sheet
 * without one has no dismiss affordance at all.
 */
export function ChoiceHost() {
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState<ChoiceRequest | null>(null);
  const chosen = useRef<(() => void) | null>(null);

  useEffect(() => {
    setChoicePresenter(setRequest);
    return () => setChoicePresenter(null);
  }, []);

  // The handler runs only once this chooser is off screen — the invariant iOS
  // gets for free from ActionSheetIOS's completion callback. The detail
  // screen's overflow opens a SECOND chooser from one of its own rows, and
  // running that while the first is still up stacks two dialogs.
  useEffect(() => {
    if (request || !chosen.current) return;
    const run = chosen.current;
    chosen.current = null;
    run();
  }, [request]);

  const take = (choice: Choice) => {
    chosen.current = choice.onPress;
    setRequest(null);
  };

  return (
    <Modal
      visible={request !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => setRequest(null)}
    >
      <Pressable
        style={styles.scrim}
        accessibilityLabel={m.common_cancel()}
        onPress={() => setRequest(null)}
      >
        {/* Swallows taps so a press on the card itself is not a dismiss. */}
        <Pressable
          accessibilityViewIsModal
          style={[styles.card, { paddingBottom: insets.bottom + 8 }]}
        >
          <Text style={styles.title}>{request?.title}</Text>
          {request?.message ? (
            <Text style={styles.message}>{request.message}</Text>
          ) : null}

          <ScrollView
            style={styles.list}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {request?.choices.map((choice) => (
              <Pressable
                key={choice.label}
                accessibilityRole="button"
                onPress={() => take(choice)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <Text
                  style={[
                    styles.rowLabel,
                    choice.destructive && styles.rowLabelDestructive,
                  ]}
                >
                  {choice.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    // The cap belongs HERE and not on the list: the scrim is the full screen, so
    // a percentage resolves against something real, while on a list inside a
    // content-sized card it resolves against a height that does not exist yet
    // and leaves the card standing tall over its own clipped rows.
    maxHeight: "80%",
    paddingTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
  },
  title: { paddingHorizontal: 20, fontSize: 17, color: colors.text },
  message: {
    marginTop: 4,
    paddingHorizontal: 20,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.muted,
  },
  // Shrinks inside the card's cap; a short list is still exactly as tall as its
  // rows, because a ScrollView does not grow past its content.
  list: { flexShrink: 1, marginTop: 12 },
  row: { paddingHorizontal: 20, paddingVertical: 14, minHeight: 52 },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowLabel: { fontSize: 16, color: colors.text },
  rowLabelDestructive: { color: colors.danger },
});
