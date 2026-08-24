import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { devForcePro, restorePro, usePro } from "@/entities/pro";
import { preferencesQuery, useUpdatePreferences } from "@/entities/user";
import { privacyUrl, termsUrl } from "@/shared/config/legal";
import type { AppLocale } from "@/shared/i18n";
import { getLocale, m } from "@/shared/i18n";
import { CURRENCY_CODES, currencyLabel } from "@/shared/lib/format";
import {
  cancelReminders,
  readNotificationSettings,
} from "@/shared/lib/notifications";
import { resetQueryCache } from "@/shared/lib/query";
import { eraseDoc } from "@/shared/lib/store";
import { clearWidget } from "@/shared/lib/widget";
import { Divider, Row, Section } from "@/shared/ui/list-row";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { presentChoice } from "@/shared/ui/present-choice";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// Endonyms, not translations: a Ukrainian speaker looking for their language in
// an English UI scans for "Українська", not for "Ukrainian".
const LANGUAGE_NAMES: Record<AppLocale, string> = {
  en: "English",
  uk: "Українська",
};

/**
 * The door to the notifications screen, and a summary of what is behind it.
 *
 * Re-reads on focus: the sub-screen writes straight to MMKV rather than to React
 * state, so coming back from it would otherwise show a stale "Off".
 */
function NotificationsRow() {
  const router = useRouter();
  const [settings, setSettings] = useState(readNotificationSettings);

  useFocusEffect(
    useCallback(() => {
      setSettings(readNotificationSettings());
    }, []),
  );

  const on = settings.renewals || settings.trials;

  return (
    <Section
      title={m.settings_notifications()}
      footnote={m.settings_remindersHint()}
    >
      <Row
        ios={on ? "bell" : "bell.slash"}
        android={on ? "notifications" : "notifications_off"}
        label={m.settings_reminders()}
        value={on ? m.settings_on() : m.settings_off()}
        onPress={() => router.push("/settings/notifications")}
      />
    </Section>
  );
}

/**
 * A standalone centered action in its own card — the shape iOS gives "Sign Out"
 * on the Apple Account screen. No icon and no chevron: the row goes nowhere, it
 * does something, and a chevron would promise a screen that does not exist.
 */
function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.action,
        pressed && styles.cardPressed,
      ]}
    >
      <Text
        style={styles.actionText}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Restore, currency, time zone, language, reminders, legal, erase.
//
// Language and time zone are OS-owned and this screen only *reports* them.
// Locale is resolved from the device (per-app language in iOS Settings /
// Android 13+) and re-synced by useAppLocale, so the Language row opens the
// OS surface instead of holding in-app locale state. The time-zone row offers
// the device zone rather than an IANA picker — the retired web client shipped
// the whole tzdb via @vvo/tzdb (216 KB) to answer what the device already knows.
export function SettingsPage() {
  const router = useRouter();
  const isPro = usePro();
  const preferences = useQuery(preferencesQuery());
  const update = useUpdatePreferences();
  const data = preferences.data;
  const [restoring, setRestoring] = useState(false);
  const [forcedPro, setForcedPro] = useState(devForcePro.get);

  // Restoring is the only Pro action that can report "nothing found" as a
  // success, so it always says something — silence would read as a dead button.
  const restore = async () => {
    setRestoring(true);
    try {
      Alert.alert(
        (await restorePro())
          ? m.paywall_restoreDone()
          : m.paywall_restoreNone(),
      );
    } catch {
      // A throw is the store failing to answer, NOT an answer of "nothing to
      // restore" — telling a paying customer their purchase does not exist is
      // how a transient outage becomes a refund request.
      Alert.alert(m.paywall_restoreFailed());
    } finally {
      setRestoring(false);
    }
  };

  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const pickCurrency = () =>
    presentChoice(
      m.settings_currency(),
      currencyLabel(data?.preferredCurrency ?? ""),
      CURRENCY_CODES.map((code) => ({
        label: currencyLabel(code),
        onPress: () => update.mutate({ preferredCurrency: code }),
      })),
    );

  // Only actionable when the stored zone has drifted from the device's — when
  // they already agree there is nothing to choose, so the row loses its chevron.
  const syncTimezone = () =>
    presentChoice(m.settings_timezone(), deviceTimezone, [
      {
        label: m.settings_timezoneUseDevice(),
        onPress: () => update.mutate({ preferredTimezone: deviceTimezone }),
      },
    ]);

  // Three copies of the data outlive the store document, and none of them is
  // React state: the pending reminders name subscriptions on the lock screen,
  // the widget snapshot sits in the shared App Group on the Home Screen, and
  // the Query cache would repaint the erased numbers from memory.
  //
  // ORDER IS LOAD-BEARING. Query is reset LAST, because the reset refetches
  // every mounted screen — doing it before `eraseDoc` only refills it from the
  // document that is still on disk. And housekeeping never decides whether the
  // erase happens: the native calls run first precisely so a rejected one
  // cannot leave the document behind.
  const eraseAll = async () => {
    await cancelReminders().catch(() => {});
    try {
      clearWidget();
    } finally {
      eraseDoc();
      await resetQueryCache();
    }
  };

  const confirmErase = () =>
    Alert.alert(m.settings_eraseConfirmTitle(), m.settings_eraseConfirmBody(), [
      { text: m.common_cancel(), style: "cancel" },
      {
        text: m.settings_erase(),
        style: "destructive",
        onPress: () => void eraseAll().catch(notifyWriteFailed),
      },
    ]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      {/* The plan and the way to recover it are one subject, so they are one
          cell. Restore is here and not only on the paywall because guideline
          3.1.1 wants it findable: a reviewer who cannot find it rejects the
          build.

          Buying used to hang off the account row, which went with Clerk. Every
          other route to the paywall is a locked feature, so without this row
          someone who simply wants to pay has nowhere to press. */}
      <Section footnote={isPro ? undefined : m.settings_proPitch()}>
        {isPro ? null : (
          <>
            <Row
              ios="sparkles"
              android="auto_awesome"
              label={m.paywall_title()}
              value={m.paywall_unlock()}
              onPress={() => router.push("/paywall")}
            />
            <Divider />
          </>
        )}
        <Row
          ios="arrow.clockwise"
          android="refresh"
          label={m.settings_restore()}
          accent
          onPress={restoring ? undefined : () => void restore()}
        />
      </Section>

      {!data && preferences.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : null}
      {!data && preferences.isError ? (
        <Text style={styles.placeholder}>{m.common_loadFailed()}</Text>
      ) : null}

      {data ? (
        <Section
          title={m.settings_preferences()}
          footnote={m.settings_deviceHint()}
        >
          <Row
            ios="creditcard"
            android="credit_card"
            label={m.settings_currency()}
            value={currencyLabel(data.preferredCurrency)}
            onPress={update.isPending ? undefined : pickCurrency}
          />
          <Divider />
          <Row
            ios="clock"
            android="schedule"
            label={m.settings_timezone()}
            value={data.preferredTimezone}
            onPress={
              data.preferredTimezone === deviceTimezone || update.isPending
                ? undefined
                : syncTimezone
            }
          />
          <Divider />
          <Row
            ios="tag"
            android="label"
            label={m.settings_categories()}
            value={isPro ? undefined : m.paywall_badge()}
            // Deep-linked, not hidden: the row is where someone goes looking
            // for categories, so it is where the paywall has to be reachable.
            onPress={() =>
              router.push(isPro ? "/settings/categories" : "/paywall")
            }
          />
          <Divider />
          <Row
            ios="globe"
            android="language"
            label={m.settings_language()}
            value={LANGUAGE_NAMES[getLocale()]}
            // The native switcher: iOS puts per-app language on the app's own
            // Settings page, Android 13+ puts it in App info. openSettings()
            // is the only route to either — there is no deep link to the
            // language row itself, and the App-Prefs: scheme is rejected.
            onPress={() => void Linking.openSettings()}
          />
        </Section>
      ) : null}

      <NotificationsRow />

      <Section title={m.settings_legal()}>
        <Row
          ios="doc.text"
          android="description"
          label={m.settings_terms()}
          onPress={() => void Linking.openURL(termsUrl())}
        />
        <Divider />
        <Row
          ios="hand.raised"
          android="privacy_tip"
          label={m.settings_privacy()}
          onPress={() => void Linking.openURL(privacyUrl())}
        />
      </Section>

      <ActionButton label={m.settings_erase()} onPress={confirmErase} />

      {/* __DEV__, not an env var: a flag configuration can enable is a flag that
          ships enabled one day. Metro strips this branch from a release bundle. */}
      {__DEV__ ? (
        <Section>
          <Row
            ios="hammer"
            android="build"
            label={m.settings_devForcePro()}
            toggle={{
              value: forcedPro,
              disabled: false,
              onValueChange: (next) => {
                devForcePro.set(next);
                setForcedPro(next);
              },
            }}
          />
        </Section>
      ) : null}

      <Text style={styles.version}>
        SubEye {Constants.expoConfig?.version ?? ""}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 24 },

  // Kept locally only for ActionButton, which is a card that is not a Section:
  // one centred destructive action, no rows, no dividers.
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    overflow: "hidden",
  },
  cardPressed: { backgroundColor: colors.surfaceAlt },

  action: { alignItems: "center", justifyContent: "center", minHeight: 52 },
  actionText: { fontSize: 16, fontWeight: "600", color: colors.danger },

  version: { fontSize: 12.5, color: colors.muted, textAlign: "center" },
  placeholder: { fontSize: 14, color: colors.muted, textAlign: "center" },
});
