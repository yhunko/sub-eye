import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useDashboard } from "@/entities/dashboard";
import { m } from "@/shared/i18n";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text
        style={styles.statLabel}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {label}
      </Text>
      <Text
        style={styles.statValue}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {value}
      </Text>
    </View>
  );
}

// Foundation smoke screen: renders the three server-computed numbers so a
// successful round trip is visible on device. Plan 6 replaces this with the real
// Home (adds "Next up" and "Resuming soon").
export function HomePage() {
  const { data, isPending, isError, refetch } = useDashboard();

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{m.home_loadError()}</Text>
        <Pressable style={styles.retry} onPress={() => void refetch()}>
          <Text style={styles.retryText}>{m.common_retry()}</Text>
        </Pressable>
      </View>
    );
  }

  const money = (amount: number) =>
    `${Math.round(amount)} ${data.preferredCurrencyCode.toUpperCase()}`;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Stat
        label={m.home_monthlyBurnRate()}
        value={money(data.monthlyBurnRate)}
      />
      <Stat
        label={m.home_yearlyForecast()}
        value={money(data.yearlyForecast)}
      />
      <Stat
        label={m.home_remainingThisMonth()}
        value={money(data.remainingThisMonth)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stat: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  statLabel: { color: colors.muted, fontSize: 13 },
  statValue: { color: colors.text, fontSize: 28, fontWeight: "700" },
  error: { color: colors.muted, fontSize: 15, textAlign: "center" },
  retry: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: { color: colors.accent, fontSize: 15, fontWeight: "600" },
});
