import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useRouter, useSegments } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";
import { AppState } from "react-native";
import { useDashboard, useMonthlySummary } from "@/entities/dashboard";
import { usePro } from "@/entities/pro";
import { subscriptionsQuery } from "@/entities/subscription";
import { useSeedPreferredCurrency } from "@/entities/user";
import { sessionHint } from "@/shared/auth";
import { m } from "@/shared/i18n";
import {
  readEffectiveSettings,
  syncReminders,
  useReminderTap,
} from "@/shared/lib/notifications";
import { syncWidget } from "@/shared/lib/widget";
import { colors } from "@/shared/ui/theme";

/**
 * Renders nothing; keeps the device's pending reminders in step with the
 * subscription list. Mounted here rather than in the root layout so it only runs
 * for a signed-in user.
 *
 * Rebuilds the whole schedule — cancel all, recompute, re-schedule — on every
 * foreground and whenever the list changes. Wholesale is what makes it
 * idempotent: no stored notification ids, no reconciliation, and no way to
 * drift. It also re-arms the window, which is what a scheduled-ahead bounded
 * plan needs; without it, a user who ignores the app eventually runs past the
 * last scheduled occurrence and goes quiet.
 *
 * `isPro` is in the dependencies for a reason: a purchase widens the plan
 * (extra lead times, trial warnings) and the schedule has to be rebuilt for it
 * without waiting for the next foreground.
 */
function ReminderSync() {
  const { data } = useQuery(subscriptionsQuery());
  const isPro = usePro();

  useEffect(() => {
    if (!data) return;

    // Settings are read at call time, not captured: the notifications screen
    // writes straight to MMKV, so a foreground sync must see the latest.
    const sync = () => {
      void syncReminders(data, readEffectiveSettings(isPro));
    };

    sync();
    const listener = AppState.addEventListener("change", (status) => {
      if (status === "active") sync();
    });
    return () => listener.remove();
  }, [data, isPro]);

  return null;
}

/**
 * Renders nothing; keeps the Home Screen widgets' shared snapshot in step with
 * the dashboard.
 *
 * Mounted beside `ReminderSync` and for the same reason: both are projections of
 * data this tree already holds, and neither is worth a screen of its own. The
 * effect is deliberately thin — `syncWidget` no-ops off iOS, drops a write that
 * would not change anything, and is the only thing that spends a WidgetKit
 * reload.
 *
 * `isPro` is a dependency because losing (or gaining) the entitlement has to
 * blank (or fill) the widget without waiting for the numbers to move.
 */
function WidgetSync() {
  const { data: dashboard } = useDashboard();
  const { data: summary } = useMonthlySummary();
  const isPro = usePro();

  useEffect(() => {
    if (!dashboard) return;

    // The monthly summary is the preferred source for both month figures, but
    // it is a second request and may still be in flight — the widget falls back
    // to the dashboard's own month total and simply hides the comparison.
    syncWidget({
      locked: !isPro,
      currency: summary?.currencyCode ?? dashboard.preferredCurrencyCode,
      monthTotal: summary?.currentMonthTotal ?? dashboard.totalUpcomingMonth,
      previousMonthTotal: summary?.previousMonthTotal ?? null,
      upcoming: dashboard.upcomingRenewals,
    });
  }, [dashboard, summary, isPro]);

  return null;
}

/** Renders nothing; sends a tapped reminder to the screen it names. */
function ReminderTapRouter() {
  const router = useRouter();

  useReminderTap((target) => {
    switch (target.screen) {
      case "subscription":
        router.push({
          pathname: "/subscriptions/[id]",
          params: { id: target.id },
        });
        return;
      case "due":
        router.push({
          pathname: "/subscriptions/due/[date]",
          params: { date: target.date },
        });
        return;
      case "list":
        router.push("/subscriptions");
    }
  });

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

/** Renders nothing; gives a brand-new account the device region's currency. */
function PreferredCurrencySeed() {
  useSeedPreferredCurrency();
  return null;
}

/**
 * True while a subscription's own screen is on top of the stack.
 *
 * UIKit hides the tab bar on a pushed screen with `hidesBottomBarWhenPushed`,
 * which react-native-screens does not expose — the only lever expo-router gives
 * is `hidden` on the tab HOST, so the layout has to work out for itself when the
 * detail screen is showing.
 *
 * Matched on the segment PAIR rather than the last segment: `[id]` alone also
 * matches the category editor, which is a sheet floating over the tab bar and
 * must not hide it, and the pair keeps the bar hidden while the detail screen's
 * own pause/pricing sheets sit on top of it.
 */
function useSubscriptionDetailFocused(): boolean {
  const segments = useSegments();
  const index = segments.indexOf("subscriptions");
  return index !== -1 && segments[index + 1] === "[id]";
}

function Tabs() {
  const onSubscriptionDetail = useSubscriptionDetailFocused();

  return (
    <>
      {/* Outside NativeTabs: its children must be triggers and nothing else. */}
      <ReminderSync />
      <WidgetSync />
      <ReminderTapRouter />
      <PreferredCurrencySeed />
      <NativeTabs
        minimizeBehavior="onScrollDown"
        tintColor={colors.accent}
        hidden={onSubscriptionDetail}
      >
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
