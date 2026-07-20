import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

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

  // Hold the splash until Clerk has restored the session from SecureStore,
  // otherwise a signed-in user is bounced to sign-in on every cold start.
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  return (
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
        <NativeTabs.Trigger.Label>{m.tabs_settings()}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
