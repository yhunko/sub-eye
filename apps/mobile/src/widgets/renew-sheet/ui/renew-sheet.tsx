import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRenewSubscription } from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { toIsoDay } from "@/shared/lib/format";
import { NativeDateField } from "@/shared/ui/native-date-field";
import { colors } from "@/shared/ui/theme";

/**
 * Restart an ended subscription on a chosen date.
 *
 * The date is not a formality: it becomes the subscription's `paymentDate`, the
 * anchor every future occurrence is projected from. Renewing a long-dead monthly
 * subscription without moving it keeps billing on the old day of the month —
 * a cycle the user is no longer on.
 *
 * Today is the default and the LATEST allowed value. The past is open on
 * purpose: someone who resubscribed three weeks ago and only now opened the app
 * has to be able to say so. A future date would mean "not started yet", which
 * this app has no state for — the picker simply will not offer one.
 */
export function RenewSheet({ id }: { id: string }) {
  const router = useRouter();
  const renew = useRenewSubscription();
  const [startedAt, setStartedAt] = useState(() => new Date());

  const submit = () => {
    renew.mutate({ id, paymentDate: toIsoDay(startedAt) });
    router.back();
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{m.renew_title()}</Text>
      <Text style={styles.body}>{m.renew_body()}</Text>

      <NativeDateField
        label={m.renew_startedOn()}
        value={startedAt}
        maximumDate={new Date()}
        onChange={setStartedAt}
      />

      <Pressable
        style={styles.primary}
        onPress={submit}
        accessibilityRole="button"
      >
        <Text style={styles.primaryLabel}>{m.action_restart()}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.bg, padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  body: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 19,
    color: colors.muted,
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
