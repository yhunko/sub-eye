import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { usePauseSubscription } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { NativeDateField } from "@/shared/ui/native-date-field";
import { colors } from "@/shared/ui/theme";

const nextMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
};

/**
 * Pause until a chosen date.
 *
 * "Pause indefinitely" is handled inline by the action sheet — it needs no
 * input. This exists only for the dated variant, because a date picker cannot
 * live inside an Alert and formSheet routes are the app's only sheet mechanism.
 *
 * The resume date matters beyond the badge: Home's "Resuming soon" list is
 * built from it.
 */
export function PauseSheet({ id }: { id: string }) {
  const router = useRouter();
  const pause = usePauseSubscription();
  const [resumeAt, setResumeAt] = useState(nextMonth);
  const [error, setError] = useState<string>();

  const submit = () => {
    if (resumeAt.getTime() <= Date.now()) {
      setError(m.validation_futureDate());
      return;
    }

    pause.mutate({ id, resumeAt: resumeAt.toISOString() });
    router.back();
  };

  return (
    <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{m.confirm_pauseTitle()}</Text>

      <NativeDateField
        label={m.pause_title()}
        value={resumeAt}
        minimumDate={new Date()}
        onChange={setResumeAt}
        error={error}
      />

      <Pressable
        style={styles.primary}
        onPress={submit}
        accessibilityRole="button"
      >
        <Text style={styles.primaryLabel}>{m.pause_confirm()}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  primary: {
    marginTop: 8,
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
  },
  primaryLabel: { fontSize: 15, fontWeight: "700", color: colors.bg },
});
