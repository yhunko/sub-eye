import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { preferencesQuery, useUpdatePreferences } from "@/entities/user";
import { m } from "@/shared/i18n";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// The complete supported set — mirrors packages/shared/src/domains/currency/constants.ts.
const CURRENCIES = [
  { code: "uah", label: "🇺🇦 UAH" },
  { code: "usd", label: "🇺🇸 USD" },
  { code: "eur", label: "🇪🇺 EUR" },
  { code: "gbp", label: "🇬🇧 GBP" },
  { code: "pln", label: "🇵🇱 PLN" },
] as const;

function Option({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <Text
        style={[styles.optionText, selected && styles.optionTextSelected]}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

// Currency, time zone, sign out. That is all.
//
// There is deliberately NO language switcher: locale is resolved from the OS
// (per-app language in iOS Settings / Android 13+) and re-synced by useAppLocale.
// And no time-zone picker — the retired web client shipped the whole IANA
// database via @vvo/tzdb (216 KB) to answer what the device already knows.
export function SettingsPage() {
  const { signOut } = useAuth();
  const preferences = useQuery(preferencesQuery());
  const update = useUpdatePreferences();
  const data = preferences.data;

  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const confirmSignOut = () =>
    Alert.alert(
      m.settings_signOutConfirmTitle(),
      m.settings_signOutConfirmBody(),
      [
        { text: m.common_cancel(), style: "cancel" },
        {
          text: m.settings_signOut(),
          style: "destructive",
          // The (tabs) layout guards on Clerk's isSignedIn and redirects to
          // /sign-in on its own, so there is nothing to navigate here.
          onPress: () => void signOut(),
        },
      ],
    );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      {!data && preferences.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : null}
      {!data && preferences.isError ? (
        <Text style={styles.placeholder}>{m.common_loadFailed()}</Text>
      ) : null}

      {data ? (
        <>
          <Section title={m.settings_currency()}>
            <View style={styles.optionRow}>
              {CURRENCIES.map((currency) => (
                <Option
                  key={currency.code}
                  label={currency.label}
                  selected={data.preferredCurrency === currency.code}
                  disabled={update.isPending}
                  onPress={() =>
                    update.mutate({ preferredCurrency: currency.code })
                  }
                />
              ))}
            </View>
          </Section>

          <Section title={m.settings_timezone()}>
            <Text style={styles.value}>{data.preferredTimezone}</Text>
            {data.preferredTimezone !== deviceTimezone ? (
              <Option
                label={`${m.settings_timezoneUseDevice()} — ${deviceTimezone}`}
                selected={false}
                disabled={update.isPending}
                onPress={() =>
                  update.mutate({ preferredTimezone: deviceTimezone })
                }
              />
            ) : null}
          </Section>
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={confirmSignOut}
        style={[styles.section, styles.signOut]}
      >
        <Text style={styles.signOutText}>{m.settings_signOut()}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 24 },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: { fontSize: 15, color: colors.text },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
  },
  optionText: { fontSize: 13.5, fontWeight: "600", color: colors.muted },
  optionTextSelected: { color: colors.accent },
  signOut: { alignItems: "center" },
  signOutText: { fontSize: 15, fontWeight: "700", color: colors.danger },
  placeholder: { fontSize: 14, color: colors.muted, textAlign: "center" },
});
