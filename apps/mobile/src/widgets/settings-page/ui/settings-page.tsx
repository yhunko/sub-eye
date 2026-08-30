import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { restorePro, usePro } from "@/entities/pro";
import { preferencesQuery, useUpdatePreferences } from "@/entities/user";
import type { AppLocale } from "@/shared/i18n";
import { getLocale, m } from "@/shared/i18n";
import { currencyLabel } from "@/shared/lib/format";
import {
  cancelReminders,
  readNotificationSettings,
} from "@/shared/lib/notifications";
import { resetQueryCache } from "@/shared/lib/query";
import {
  clearCloud,
  cloudSyncAvailable,
  cloudSyncEnabled,
  eraseDoc,
  setCloudSyncEnabled,
} from "@/shared/lib/store";
import { clearWidget } from "@/shared/lib/widget";
import { Divider, Row, Section } from "@/shared/ui/list-row";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { presentChoice } from "@/shared/ui/present-choice";
import { colors } from "@/shared/ui/theme";

// Endonyms, not translations: a Ukrainian speaker looking for their language in
// an English UI scans for "Українська", not for "Ukrainian".
const LANGUAGE_NAMES: Record<AppLocale, string> = {
  en: "English",
  uk: "Українська",
};

/**
 * The door to the notifications screen, and a summary of what is behind it.
 *
 * A row inside Preferences rather than a section of its own: alone it was a
 * one-row card with a caption, which is the widest possible frame around the
 * narrowest possible thing. Next to Categories — the other door to a
 * `/settings/*` sub-screen — it needs no caption at all, so the footnote it used
 * to carry is gone rather than moved.
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
    <Row
      ios={on ? "bell" : "bell.slash"}
      android={on ? "notifications" : "notifications_off"}
      label={m.settings_reminders()}
      value={on ? m.settings_on() : m.settings_off()}
      onPress={() => router.push("/settings/notifications")}
    />
  );
}

/**
 * The one switch in the app that sends anything anywhere.
 *
 * It is a switch and not a default because "everything stays on this phone" is
 * what the app promises; and it is free rather than Pro because insurance behind
 * a paywall reads as a threat in a way a capability does not.
 *
 * The footnote does the real work here. Two different things are commonly called
 * "iCloud" and only one of them is this: the store already rides along in device
 * BACKUP with the switch off, which is what covers a lost phone. What this buys
 * is a second device, so the copy has to say that rather than "keep your data
 * safe" — a user who reads this as backup will turn it off and think they have
 * lost nothing.
 *
 * Availability is read on focus, not once: signing into iCloud happens in the
 * Settings app, which means leaving and coming back to this screen.
 */
function DataSection({ onErase }: { onErase: () => void }) {
  // iOS only, and absent rather than disabled on Android: there is no Android
  // equivalent of NSUbiquitousKeyValueStore, and a permanently dead switch
  // offering to "sign in to iCloud" is worse than no switch. The SECTION still
  // renders there — Erase lives in it, and gating the whole thing would take the
  // only way to wipe the app off Android entirely.
  const canSync = Platform.OS === "ios";
  const [available, setAvailable] = useState(cloudSyncAvailable);
  const [enabled, setEnabled] = useState(cloudSyncEnabled);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setAvailable(cloudSyncAvailable());
      // The observer switches sync off by itself when a different Apple Account
      // signs in, so the stored flag can move without this screen touching it.
      setEnabled(cloudSyncEnabled());
    }, []),
  );

  const toggle = (next: boolean) => {
    setBusy(true);
    try {
      setCloudSyncEnabled(next);
      setEnabled(next);
    } finally {
      setBusy(false);
    }
    // Linking folds the other devices' records into the document underneath
    // every mounted screen, so the caches have to be dropped rather than nudged.
    if (next) void resetQueryCache();
  };

  return (
    <Section
      title={m.settings_data()}
      // The footnote belongs to the switch, so it only appears with it. Under a
      // lone Erase row it would read as a caption for the wipe.
      footnote={
        canSync
          ? available
            ? m.settings_syncHint()
            : m.settings_syncUnavailableHint()
          : undefined
      }
    >
      {canSync ? (
        <>
          <Row
            ios={enabled ? "icloud.fill" : "icloud.slash"}
            android={enabled ? "cloud_done" : "cloud_off"}
            label={m.settings_sync()}
            subtitle={enabled ? undefined : m.settings_syncOffSubtitle()}
            toggle={{
              value: enabled,
              disabled: busy || !available,
              onValueChange: toggle,
            }}
          />
          <Divider />
        </>
      ) : null}
      {/* Last in the group and red, the way UIKit orders a destructive row: it
          is the same subject as the switch above it — where this data lives and
          whether it exists — and it used to sit below Legal, three sections away
          from anything about data. */}
      <Row
        ios="trash"
        android="delete"
        label={m.settings_erase()}
        destructive
        onPress={onErase}
      />
    </Section>
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

  // Only actionable when the stored zone has drifted from the device's — when
  // they already agree there is nothing to choose, so the row loses its chevron.
  const syncTimezone = () =>
    presentChoice(m.settings_timezone(), deviceTimezone, [
      {
        label: m.settings_timezoneUseDevice(),
        onPress: () => update.mutate({ preferredTimezone: deviceTimezone }),
      },
    ]);

  // FOUR copies of the data outlive the store document, and none of them is
  // React state: the pending reminders name subscriptions on the lock screen,
  // the widget snapshot sits in the shared App Group on the Home Screen, the
  // Query cache would repaint the erased numbers from memory, and — since sync
  // — iCloud holds a record per key that the very next reconcile would pull
  // straight back onto this device.
  //
  // ORDER IS LOAD-BEARING. iCloud is cleared BEFORE the document, because
  // `clearCloud` is a no-op once sync has nothing left to be enabled about, and
  // Query is reset LAST, because the reset refetches every mounted screen —
  // doing it before `eraseDoc` only refills it from the document that is still
  // on disk. Housekeeping never decides whether the erase happens: the native
  // calls run first precisely so a rejected one cannot leave the document
  // behind.
  const eraseAll = async () => {
    await cancelReminders().catch(() => {});
    try {
      clearCloud();
      clearWidget();
    } finally {
      eraseDoc();
      await resetQueryCache();
    }
  };

  // The confirmation names iCloud only when there is an iCloud copy to name.
  // "This cannot be undone" is a much bigger claim once the erase reaches the
  // user's other devices, and a user who has never switched sync on should not
  // be made to think about it.
  const confirmErase = () =>
    Alert.alert(
      m.settings_eraseConfirmTitle(),
      cloudSyncEnabled()
        ? `${m.settings_eraseConfirmBody()}\n\n${m.settings_eraseConfirmCloud()}`
        : m.settings_eraseConfirmBody(),
      [
        { text: m.common_cancel(), style: "cancel" },
        {
          text: m.settings_erase(),
          style: "destructive",
          onPress: () => void eraseAll().catch(notifyWriteFailed),
        },
      ],
    );

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
          someone who simply wants to pay has nowhere to press.

          Once bought, the row does NOT disappear — it flips. With nothing here
          but Restore, the only way to find out whether an Apple Account already
          owned Pro was to press Restore and read the alert, which is a purchase
          button's worth of anxiety for a question the screen can just answer.
          The footnote flips with it and is what makes Restore below make sense:
          the entitlement lives on the Apple Account, not on this install. */}
      <Section
        footnote={isPro ? m.settings_proActiveHint() : m.settings_proPitch()}
      >
        {isPro ? (
          <>
            <Row
              // `leading`, not the `ios`/`android` pair, for the one row that
              // needs a tinted glyph: the pair is always drawn muted, and the
              // green seal IS the answer to "do I have this?" — read before any
              // of the words are.
              leading={
                <SymbolView
                  name={{ ios: "checkmark.seal.fill", android: "verified" }}
                  size={19}
                  tintColor={colors.accent}
                />
              }
              label={m.paywall_title()}
              value={m.settings_proActive()}
            />
            <Divider />
          </>
        ) : (
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
            onPress={() => router.push("/currency")}
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
          <NotificationsRow />
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

      {/* After Preferences: it is about the data itself, which is a narrower
          subject than the app's settings and the last thing in the list that is
          still about this install rather than about the app. */}
      <DataSection onErase={confirmErase} />

      {/* __DEV__, not an env var: a flag configuration can enable is a flag that
          ships enabled one day. Metro strips this branch from a release bundle,
          and the route it points at strips the screen itself — the label is
          hardcoded English for the same reason the screen's is. */}
      {__DEV__ ? (
        <Section>
          <Row
            ios="hammer"
            android="build"
            label="Developer"
            onPress={() => router.push("/settings/developer")}
          />
        </Section>
      ) : null}

      <Section title={m.settings_legal()}>
        <Row
          ios="doc.text"
          android="description"
          label={m.settings_terms()}
          onPress={() => router.push("/legal/terms-of-service")}
        />
        <Divider />
        <Row
          ios="hand.raised"
          android="privacy_tip"
          label={m.settings_privacy()}
          onPress={() => router.push("/legal/privacy-policy")}
        />
      </Section>

      {/* Two lines, not one: the version is a support detail someone reads out
          loud in a bug report, and the other line is not. */}
      <View style={styles.colophon}>
        <Text style={styles.version}>
          SubEye {Constants.expoConfig?.version ?? ""}
        </Text>
        <Text style={styles.version}>{m.settings_madeInUkraine()}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 24 },

  colophon: { gap: 2 },
  version: { fontSize: 12.5, color: colors.muted, textAlign: "center" },
  placeholder: { fontSize: 14, color: colors.muted, textAlign: "center" },
});
