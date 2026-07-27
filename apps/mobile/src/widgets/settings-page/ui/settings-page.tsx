import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import { type ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { subscriptionsQuery } from "@/entities/subscription";
import { preferencesQuery, useUpdatePreferences } from "@/entities/user";
import { privacyUrl, termsUrl } from "@/shared/config/legal";
import type { AppLocale } from "@/shared/i18n";
import { getLocale, m } from "@/shared/i18n";
import { CURRENCY_CODES, currencyLabel } from "@/shared/lib/format";
import {
  cancelRenewalReminders,
  renewalRemindersBlocked,
  renewalRemindersEnabled,
  setRenewalRemindersEnabled,
} from "@/shared/lib/notifications";
import { notifyWriteFailed } from "@/shared/ui/notify";
import { presentChoice } from "@/shared/ui/present-choice";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// Endonyms, not translations: a Ukrainian speaker looking for their language in
// an English UI scans for "Українська", not for "Ukrainian".
const LANGUAGE_NAMES: Record<AppLocale, string> = {
  en: "English",
  uk: "Українська",
};

// Separator inset: row padding (16) + icon (19) + gap (13), so the rule starts
// under the label rather than under the icon.
const DIVIDER_INSET = 48;

const Divider = () => <View style={styles.divider} />;

function Row({
  ios,
  android,
  label,
  value,
  onPress,
  accent,
  toggle,
}: {
  ios: SFSymbol;
  android: AndroidSymbol;
  label: string;
  value?: string;
  onPress?: () => void;
  /** Tints the row as an action rather than a destination. */
  accent?: boolean;
  /** Renders a Switch in place of the chevron. Mutually exclusive with onPress. */
  toggle?: {
    value: boolean;
    disabled: boolean;
    onValueChange: (next: boolean) => void;
  };
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <SymbolView
        name={{ ios, android }}
        size={19}
        tintColor={accent ? colors.accent : colors.muted}
        weight="regular"
      />
      <Text
        style={[styles.rowLabel, accent && styles.rowLabelAccent]}
        numberOfLines={1}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {label}
      </Text>
      {value ? (
        <Text
          style={styles.rowValue}
          numberOfLines={1}
          maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
        >
          {value}
        </Text>
      ) : null}
      {toggle ? (
        // The platform control, deliberately: the design's toggle IS a stock
        // iOS switch, and Android gets Material 3 for free.
        <Switch
          style={styles.toggle}
          value={toggle.value}
          disabled={toggle.disabled}
          onValueChange={toggle.onValueChange}
          trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
        />
      ) : null}
      {onPress ? (
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={13}
          tintColor={colors.muted}
          weight="semibold"
        />
      ) : null}
    </Pressable>
  );
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

/**
 * Renewal reminders — scheduled on this device, never on the server. The stored
 * preference is therefore PER-DEVICE, not per-account: two phones toggle and
 * schedule independently, and a reinstall forgets it. That is the price of the
 * zero-server design, and it is the right trade here.
 *
 * Two states, from the design. Resting: a switch. Permission denied: the switch
 * is replaced by a plain "Off" plus a route into the OS settings — on iOS a
 * refusal is terminal (`requestPermissionsAsync` never prompts again), so a live
 * switch there would be a control that does nothing.
 */
function RenewalReminders() {
  const subscriptions = useQuery(subscriptionsQuery());
  const [enabled, setEnabled] = useState(renewalRemindersEnabled);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  // Permission can change while we are backgrounded — this row is what sends the
  // user to the OS settings in the first place — so re-read on every foreground,
  // not only on mount.
  useEffect(() => {
    const read = () => {
      void renewalRemindersBlocked().then(setBlocked);
    };

    read();
    const listener = AppState.addEventListener("change", (status) => {
      if (status === "active") read();
    });
    return () => listener.remove();
  }, []);

  const toggle = async (next: boolean) => {
    setBusy(true);
    // An empty list on a cold start is fine: the flag is what persists, and the
    // app-layer sync re-schedules as soon as the query resolves.
    setEnabled(
      await setRenewalRemindersEnabled(next, subscriptions.data ?? []),
    );
    setBlocked(await renewalRemindersBlocked());
    setBusy(false);
  };

  return (
    <View>
      <Group title={m.settings_notifications()}>
        <Row
          ios={blocked ? "bell.slash" : "bell"}
          android={blocked ? "notifications_off" : "notifications"}
          label={m.settings_renewalReminders()}
          value={blocked ? m.settings_off() : undefined}
          toggle={
            blocked
              ? undefined
              : {
                  value: enabled,
                  disabled: busy,
                  onValueChange: (next) => void toggle(next),
                }
          }
        />
        {blocked ? (
          <>
            <Divider />
            <Row
              ios="gearshape"
              android="settings"
              label={m.settings_openDeviceSettings()}
              accent
              onPress={() => void Linking.openSettings()}
            />
          </>
        ) : null}
      </Group>
      <Text style={styles.groupFootnote}>
        {blocked
          ? m.settings_renewalRemindersBlocked()
          : m.settings_renewalRemindersHint()}
      </Text>
    </View>
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
        styles.group,
        styles.action,
        pressed && styles.rowPressed,
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

// The identity header iOS puts at the top of Settings: big round avatar, name,
// email, centered, on the plain grouped background rather than in a card.
function AccountHeader() {
  const { user } = useUser();
  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name = user.fullName ?? user.username ?? email;

  return (
    <View style={styles.account}>
      {/* hasImage, not imageUrl: Clerk always returns a URL and synthesises an
          initials avatar when none was uploaded — its generated one, not ours. */}
      {user.hasImage ? (
        <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>
            {(name.at(0) ?? "?").toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.accountName}>{name}</Text>
      {email ? (
        <Text style={styles.accountEmail} numberOfLines={1}>
          {email}
        </Text>
      ) : null}
    </View>
  );
}

// Currency, time zone, language, sign out, delete account.
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
  const preferences = useQuery(preferencesQuery());
  const update = useUpdatePreferences();
  const data = preferences.data;

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
          // /sign-in on its own, so there is nothing to navigate here. Drop the
          // pending reminders first: they are scheduled on the device and would
          // keep naming this account's subscriptions on the lock screen.
          onPress: () => void cancelRenewalReminders().then(() => signOut()),
        },
      ],
    );

  // Clerk's user.delete() ends the session, and the `user.deleted` webhook is
  // what removes the Postgres rows (routes/webhooks/clerk) — deleting here does
  // NOT need a server call of its own.
  const confirmDelete = () =>
    Alert.alert(
      m.settings_deleteAccountConfirmTitle(),
      m.settings_deleteAccountConfirmBody(),
      [
        { text: m.common_cancel(), style: "cancel" },
        {
          text: m.action_delete(),
          style: "destructive",
          // Same reason as sign-out, more so: the account is gone but its
          // locally-scheduled reminders would outlive it.
          onPress: () =>
            void cancelRenewalReminders().then(() =>
              user?.delete().catch(notifyWriteFailed),
            ),
        },
      ],
    );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <AccountHeader />

      {!data && preferences.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : null}
      {!data && preferences.isError ? (
        <Text style={styles.placeholder}>{m.common_loadFailed()}</Text>
      ) : null}

      {data ? (
        <View>
          <Group title={m.settings_preferences()}>
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
          </Group>
          <Text style={styles.groupFootnote}>{m.settings_deviceHint()}</Text>
        </View>
      ) : null}

      <RenewalReminders />

      <Group title={m.settings_legal()}>
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
      </Group>

      {/* Two separate cards, not two rows in one: sign-out is reversible and
          deletion is not, and the gap between them is what stops a mis-tap. */}
      <ActionButton label={m.settings_signOut()} onPress={confirmSignOut} />
      <ActionButton
        label={m.settings_deleteAccount()}
        onPress={user ? confirmDelete : undefined}
      />

      <Text style={styles.version}>
        SubEye {Constants.expoConfig?.version ?? ""}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 24 },

  account: { alignItems: "center", paddingTop: 8 },
  avatar: { width: 104, height: 104, borderRadius: 999 },
  avatarFallback: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 40, fontWeight: "700", color: colors.muted },
  accountName: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginTop: 12,
  },
  accountEmail: { fontSize: 15, color: colors.muted, marginTop: 2 },

  groupTitle: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    overflow: "hidden",
  },
  groupFootnote: {
    fontSize: 12.5,
    color: colors.muted,
    paddingHorizontal: 4,
    paddingTop: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: DIVIDER_INSET,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  // Not decoration: RN's iOS Switch hardcodes `alignSelf: "flex-start"` under
  // the caller's style (Libraries/Components/Switch/Switch.js). The cross axis
  // of a row is vertical, so that pins the switch to the row's TOP and beats the
  // parent's alignItems — it sat 12pt above the label until this line.
  toggle: { alignSelf: "center" },
  rowLabel: { flex: 1, fontSize: 16, color: colors.text },
  rowLabelAccent: { color: colors.accent, fontWeight: "600" },
  rowValue: { fontSize: 16, color: colors.muted, flexShrink: 1 },

  action: { alignItems: "center", justifyContent: "center", minHeight: 52 },
  actionText: { fontSize: 16, fontWeight: "600", color: colors.danger },

  version: { fontSize: 12.5, color: colors.muted, textAlign: "center" },
  placeholder: { fontSize: 14, color: colors.muted, textAlign: "center" },
});
