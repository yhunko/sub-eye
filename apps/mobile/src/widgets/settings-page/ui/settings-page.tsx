import { useAuth, useUser } from "@clerk/clerk-expo";
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
  View,
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
import { clearQueryCache } from "@/shared/lib/query";
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

/**
 * The initials circle, at icon size.
 *
 * There is no photo branch because there is no photo: neither sign-up path
 * uploads one and Apple hands back no image, so `user.hasImage` is false for
 * every account this app can create. Clerk would happily serve `imageUrl` — a
 * generated initials avatar of its own — which is a network fetch to render a
 * letter we already have.
 */
function Avatar({ initial }: { initial: string }) {
  return (
    <View style={styles.avatar}>
      <Text
        style={styles.avatarText}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {initial}
      </Text>
    </View>
  );
}

// Account and plan, currency, time zone, language, sign out, delete account.
//
// Language and time zone are OS-owned and this screen only *reports* them.
// Locale is resolved from the device (per-app language in iOS Settings /
// Android 13+) and re-synced by useAppLocale, so the Language row opens the
// OS surface instead of holding in-app locale state. The time-zone row offers
// the device zone rather than an IANA picker — the retired web client shipped
// the whole tzdb via @vvo/tzdb (216 KB) to answer what the device already knows.
export function SettingsPage() {
  const { signOut } = useAuth();
  const { user } = useUser();
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
      Alert.alert(m.paywall_restoreNone());
    } finally {
      setRestoring(false);
    }
  };

  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  // `fullName` is always null — neither sign-up path collects a name — so this
  // resolves to the username, and to the email again for an Apple sign-in,
  // which supplies neither. Hence the subtitle check below.
  const accountName = user?.fullName ?? user?.username ?? email;

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

  // Ends the session and takes this account's data off the device with it.
  //
  // Three stores outlive a Clerk session because none of them is React state:
  // the pending reminders name subscriptions on the lock screen, the widget
  // snapshot sits in the shared App Group on the Home Screen, and the Query
  // cache is keyed WITHOUT a user id and re-hydrated from MMKV at module load —
  // so the next account signs in onto the previous one's numbers.
  //
  // Order is load-bearing. The cache is cleared AFTER the session ends: a
  // mounted screen's observer refetches the instant its query is removed, so
  // clearing first only refills it under the account that is still signed in.
  // And housekeeping never decides whether the session ends — a rejected native
  // call used to leave the user signed in with nothing shown.
  const endSession = async (end: () => Promise<unknown> | undefined) => {
    await cancelReminders().catch(() => {});
    clearWidget();
    try {
      await end();
    } finally {
      clearQueryCache();
    }
  };

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
          onPress: () =>
            void endSession(() => signOut()).catch(notifyWriteFailed),
        },
      ],
    );

  // Clerk's user.delete() ends the session, and the `user.deleted` webhook is
  // what removes the Postgres rows (routes/webhooks/clerk) — deleting here does
  // NOT need a server call of its own. The one thing it cannot cover is Apple's
  // 5.1.1(v) token revocation: `/auth/revoke` needs the Services ID and the .p8
  // client secret, which must never be in a client binary, so that obligation
  // belongs to the `user.deleted` webhook or to Clerk.
  const confirmDelete = () =>
    Alert.alert(
      m.settings_deleteAccountConfirmTitle(),
      m.settings_deleteAccountConfirmBody(),
      [
        { text: m.common_cancel(), style: "cancel" },
        {
          text: m.action_delete(),
          style: "destructive",
          // Same reason as sign-out, more so: the account is gone but every
          // local trace of it would outlive it.
          onPress: () =>
            void endSession(() => user?.delete()).catch(notifyWriteFailed),
        },
      ],
    );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      {/* Identity and entitlement are one object — "this account, on this
          plan" — so they are one cell, the shape iOS gives the Apple Account
          row. Restore shares the card because it is the same subject, and
          because guideline 3.1.1 wants it findable outside the paywall: a
          reviewer who cannot find it rejects the build.

          The account row is conditional and Restore is not. Clerk resolves
          `user` over the network while the rest of this screen paints from the
          persisted cache, and an empty name is worse than a late one — but
          Restore has to be there on every render regardless. */}
      <Section footnote={isPro ? undefined : m.settings_proPitch()}>
        {user ? (
          <>
            <Row
              leading={
                <Avatar initial={(accountName.at(0) ?? "?").toUpperCase()} />
              }
              label={accountName}
              subtitle={accountName === email ? undefined : email}
              value={isPro ? m.paywall_badge() : m.settings_free()}
              onPress={isPro ? undefined : () => router.push("/paywall")}
            />
            <Divider />
          </>
        ) : null}
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

      {/* Two separate cards, not two rows in one: sign-out is reversible and
          deletion is not, and the gap between them is what stops a mis-tap. */}
      <ActionButton label={m.settings_signOut()} onPress={confirmSignOut} />
      <ActionButton
        label={m.settings_deleteAccount()}
        onPress={user ? confirmDelete : undefined}
      />

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

  // 30, not the 19 a Row's symbol gets: a circle reads as an avatar only once it
  // is wider than the glyphs around it, and the row's own padding absorbs it.
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "600", color: colors.muted },

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
