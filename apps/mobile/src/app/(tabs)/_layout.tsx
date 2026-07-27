import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";
import { AppState } from "react-native";
import { subscriptionsQuery } from "@/entities/subscription";
import { sessionHint } from "@/shared/auth";
import { m } from "@/shared/i18n";
import { syncRenewalReminders } from "@/shared/lib/notifications";
import { colors } from "@/shared/ui/theme";

/**
 * Renders nothing; keeps the device's pending renewal reminders in step with the
 * subscription list. Mounted here rather than in the root layout so it only runs
 * for a signed-in user.
 *
 * Rebuilds the whole schedule — cancel all, recompute, re-schedule — on every
 * foreground and whenever the list changes. Wholesale is what makes it
 * idempotent: no stored notification ids, no reconciliation, and no way to
 * drift. It also re-arms the window, which is what a scheduled-ahead bounded
 * plan needs; without it, a user who ignores the app eventually runs past the
 * last scheduled occurrence and goes quiet.
 */
function RenewalReminderSync() {
  const { data } = useQuery(subscriptionsQuery());

  useEffect(() => {
    if (!data) return;

    const sync = () => {
      void syncRenewalReminders(data);
    };

    sync();
    const listener = AppState.addEventListener("change", (status) => {
      if (status === "active") sync();
    });
    return () => listener.remove();
  }, [data]);

  return null;
}

// FSD app layer: the native tab bar. Liquid Glass on iOS 26, Material 3 on
// Android — rendered by the platform, not by JS.
//
// ALPHA CONSTRAINT (expo-router/unstable-native-tabs): triggers must be STATIC.
// Do not map an array into <NativeTabs.Trigger>, do not conditionally render one,
// do not compute `name`. Icons use the two platform props: `sf` = an iOS SF
// Symbol name, `md` = an Android Material Symbols name. There is no cross-
// platform icon component here by design.
//
// minimizeBehavior="onScrollDown": the iOS 26 pill tab bar collapses as a list
// scrolls down and re-expands on scroll up.
export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  // Clerk's isLoaded waits on a client handshake — a network round-trip, not a
  // SecureStore read. Blocking on it left a returning user staring at a black
  // screen, so the device's own record of the last session decides what to mount
  // and the synchronously-hydrated Query cache paints real numbers immediately.
  //
  // The hint is trusted in BOTH directions on purpose: rendering nothing while
  // undecided is the same black screen by another name. Clerk still has the
  // final say — it redirects here when it resolves to signed-out, and (auth)
  // redirects back when it resolves to signed-in, so a stale hint in either
  // direction costs one redirect and never data. Every request carries a real
  // token and the server 401s without one.
  if (!isLoaded) {
    return sessionHint.read() ? <Tabs /> : <Redirect href="/sign-in" />;
  }
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  return <Tabs />;
}

function Tabs() {
  return (
    <>
      {/* Outside NativeTabs: its children must be triggers and nothing else. */}
      <RenewalReminderSync />
      <NativeTabs minimizeBehavior="onScrollDown" tintColor={colors.accent}>
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Icon sf="house" md="home" />
          <NativeTabs.Trigger.Label>{m.tabs_home()}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="subscriptions">
          <NativeTabs.Trigger.Icon sf="rectangle.stack" md="stacks" />
          <NativeTabs.Trigger.Label>
            {m.tabs_subscriptions()}
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
          <NativeTabs.Trigger.Label>
            {m.tabs_settings()}
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}
