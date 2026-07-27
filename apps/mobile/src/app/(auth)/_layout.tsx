import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";
import { colors } from "@/shared/ui/theme";

// The auth flow sits outside the tab tree and draws its own chrome: every screen
// has a back affordance in its own layout, so there is no native header here.
//
// Sign-in and sign-up are PEERS, not a hierarchy — either is a valid way into the
// app, and the footer links swap between them with `replace`. A slide would read
// as "forward" in one direction and "back" in the other, which is exactly the
// hierarchy that does not exist; a fade has no direction. Verify-email and
// reset-password ARE children — they keep the default push.
export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  // The mirror of the tab tree's session hint. A cold start with no hint lands
  // here immediately rather than on a blank screen, so if the hint was stale —
  // MMKV cleared, or a session restored from the keychain — Clerk resolving
  // signed-in has to bounce the user back out, or they sit on a sign-in form
  // for an account they are already signed in to.
  if (isLoaded && isSignedIn) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="sign-in" options={{ animation: "fade" }} />
      <Stack.Screen name="sign-up" options={{ animation: "fade" }} />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
