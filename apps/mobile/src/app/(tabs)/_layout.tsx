import { applyDuePhases } from "@subeye/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";
import { AppState } from "react-native";
import { useDashboard, useMonthlySummary } from "@/entities/dashboard";
import { usePro } from "@/entities/pro";
import {
  invalidateSubscriptionData,
  subscriptionsQuery,
} from "@/entities/subscription";
import { m } from "@/shared/i18n";
import {
  readEffectiveSettings,
  syncReminders,
  useReminderTap,
} from "@/shared/lib/notifications";
import {
  cachedRateDate,
  localPorts,
  observeCloud,
  pushToCloud,
  refreshRates,
} from "@/shared/lib/store";
import { syncWidget } from "@/shared/lib/widget";
import { colors } from "@/shared/ui/theme";

/**
 * Renders nothing; keeps the device's pending reminders in step with the
 * subscription list.
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
  return <Tabs />;
}

/**
 * Renders nothing; settles price-phase boundaries that have come due.
 *
 * There is no scheduler and there never was — a phase fires when the
 * subscription it belongs to is READ, which `getSubscription` does for the
 * detail screen. A subscription the user never opens never settles, so this
 * covers the rest of the list on every foreground.
 *
 * Reads the phase rows rather than the list: `PricePhaseDto` carries no
 * `appliedAt`, and `upcomingPhase` skips anything already past its start — so
 * neither DTO field can tell a pending phase from a settled one. Production
 * holds zero phase rows, which makes the early return the normal path.
 */
function DuePhaseSync() {
  const client = useQueryClient();

  useEffect(() => {
    const pendingPhases = async () =>
      (await localPorts.phases.all()).filter((phase) => !phase.appliedAt);

    const settle = async () => {
      const pending = await pendingPhases();
      if (!pending.length) return;

      for (const id of new Set(pending.map((p) => p.subscriptionId))) {
        await applyDuePhases(localPorts, id);
      }

      // Pending only shrinks by being applied, so this is the exact signal that
      // something moved. Without it a merely SCHEDULED change would invalidate
      // every screen on every foreground for nothing.
      if ((await pendingPhases()).length !== pending.length) {
        await invalidateSubscriptionData(client);
      }
    };

    void settle();
    const listener = AppState.addEventListener("change", (status) => {
      if (status === "active") void settle();
    });
    return () => listener.remove();
  }, [client]);

  return null;
}

/**
 * Renders nothing; pulls the day's FX build into the cache.
 *
 * `ratesPort` never fetches, so without this the app converts every foreign
 * subscription at the rates pinned in `fx-seed.json` at build time — forever,
 * and silently, because a stale rate still produces a plausible number.
 *
 * Invalidates only when the cached build actually MOVED. `refreshRates` reports
 * success both for a fetch that landed and for a cache that was already today's,
 * and the second is the common case — treating it as a change would repaint
 * every money screen on every foreground for nothing.
 */
function RatesSync() {
  const client = useQueryClient();

  useEffect(() => {
    const refresh = async () => {
      const before = cachedRateDate();
      await refreshRates(new Date());
      if (cachedRateDate() !== before) await invalidateSubscriptionData(client);
    };

    void refresh();
    const listener = AppState.addEventListener("change", (status) => {
      if (status === "active") void refresh();
    });
    return () => listener.remove();
  }, [client]);

  return null;
}

/**
 * Renders nothing; folds edits made on the user's other devices into this one.
 *
 * Mounted unconditionally, like its neighbours, and `observeCloud` decides for
 * itself whether there is anything to listen to — the switch can be flipped in
 * Settings while this is mounted, and a gate here would leave the listener
 * subscribed to the wrong answer until the next remount.
 *
 * Invalidating is the whole point of the callback: the document changed
 * underneath a screen that is already rendering it, and there is no write here
 * for Query to have observed.
 */
function CloudSync() {
  const client = useQueryClient();

  useEffect(() => {
    const unsubscribe = observeCloud(() => {
      void invalidateSubscriptionData(client);
    });

    // Push on foreground as well as on write. Every mutation reconciles, so this
    // only ever catches what a mutation could not: the app killed between the
    // local write and the upload, and a write iOS refused at the time. It is a
    // local diff over ~70 keys and sends nothing when they already agree.
    pushToCloud();
    const listener = AppState.addEventListener("change", (status) => {
      if (status === "active") pushToCloud();
    });

    return () => {
      listener.remove();
      unsubscribe();
    };
  }, [client]);

  return null;
}

function Tabs() {
  return (
    <>
      {/* Outside NativeTabs: its children must be triggers and nothing else. */}
      <ReminderSync />
      <WidgetSync />
      <ReminderTapRouter />
      <DuePhaseSync />
      <RatesSync />
      <CloudSync />
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
        {/* Free, like the three around it: see `CalendarPage` for why a tab is
            the wrong place to put a gate. */}
        <NativeTabs.Trigger name="calendar">
          <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
          <NativeTabs.Trigger.Label>
            {m.tabs_calendar()}
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
