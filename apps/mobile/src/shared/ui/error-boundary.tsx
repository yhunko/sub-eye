import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { reportError } from "@/shared/lib/sentry";
import { colors } from "./theme";

/**
 * What expo-router renders when a screen throws. Without it a Release build
 * shows a blank window — the red box is a development-only affordance, so in
 * production the app simply stops with nothing on screen and nothing logged.
 *
 * Deliberately plain: no Clerk, no Query, no navigation. This renders when
 * something in that stack has already failed, so anything it touches is a second
 * crash with no handler left above it. `retry` is expo-router's own — it remounts
 * the subtree rather than restarting the app.
 *
 * The message is shown only in development. A stack trace is not something a
 * user can act on, and it is the one place app internals would reach the screen.
 *
 * Reporting is the one exception to "touches nothing": `reportError` cannot
 * throw, and a crash nobody ever hears about is the reason this screen was
 * invisible in production for its whole life.
 */
export function AppErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => Promise<void>;
}) {
  // Keyed on the error, not on mount: `retry` remounts the subtree below without
  // unmounting this, and a re-render must not file the same crash twice.
  useEffect(() => {
    reportError(error, { boundary: "root" });
  }, [error]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{m.error_crashTitle()}</Text>
      <Text style={styles.body}>{m.error_crashBody()}</Text>
      {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>{m.common_retry()}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
    backgroundColor: colors.bg,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    textAlign: "center",
  },
  detail: {
    fontSize: 12,
    color: colors.danger,
    textAlign: "center",
    fontFamily: "Menlo",
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  buttonLabel: { fontSize: 15, fontWeight: "600", color: colors.accent },
});
