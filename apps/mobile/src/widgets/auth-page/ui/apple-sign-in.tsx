import { useSignInWithApple } from "@clerk/clerk-expo";
import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { m } from "@/shared/i18n";
import { termsConsent } from "../model/consent";

const APPLE = "Apple";

/**
 * Sign in with Apple, natively — App Store Guideline 4.8 requires a
 * privacy-preserving login next to Google/GitHub, and neither of those
 * qualifies.
 *
 * This is `useSignInWithApple`, not `useSSO({ strategy: "oauth_apple" })`:
 * clerk-expo 2.19's hook drives `expo-apple-authentication` and hands Clerk the
 * identity token (`signIn.create({ strategy: "oauth_token_apple" })`,
 * transferring to `signUp` when the account is new). The web flow would open an
 * SFSafariViewController, which reviewers read as non-native and which Apple's
 * own button is not allowed to launch.
 */
export function useAppleSignIn(onError: (message: string) => void) {
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const start = async () => {
    if (pending) return;
    setPending(true);
    try {
      const { createdSessionId, setActive } =
        await startAppleAuthenticationFlow({ unsafeMetadata: termsConsent() });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        // Same as the web SSO flow: these screens sit outside the tab tree, so
        // flipping isSignedIn does not move the user on its own.
        router.replace("/");
        return;
      }

      // No session and no throw means the user dismissed Apple's sheet (the hook
      // swallows ERR_REQUEST_CANCELED) or Clerk had not loaded yet. Neither is a
      // failure worth a red banner over — the user is looking at the screen they
      // chose to come back to.
    } catch {
      onError(m.auth_ssoFailed({ provider: APPLE }));
    } finally {
      setPending(false);
    }
  };

  return {
    pending,
    start: () => void start(),
  };
}

/**
 * Apple's own `ASAuthorizationAppleIDButton`, not a `Button` with an apple
 * glyph: Apple owns this control's wording, localisation and metrics, and a
 * hand-drawn imitation is a rejection. It is also why `BrandLogo` — which
 * fetches favicons from Google — must never render here.
 */
export function AppleSignInButton({
  intent,
  onPress,
  disabled,
}: {
  intent: "signIn" | "signUp";
  onPress: () => void;
  disabled?: boolean;
}) {
  // iOS-only by construction. `expo-apple-authentication` has no Android
  // implementation, Guideline 4.8 is an App Store rule, and Clerk's web
  // `oauth_apple` fallback needs a Services ID + web redirect that this project
  // does not configure. Android keeps Google/GitHub.
  //
  // No isAvailableAsync() probe: it is false only below iOS 13, and this app's
  // deployment target is far above that — an async gate would just pop the
  // button in a frame late.
  if (Platform.OS !== "ios") return null;

  return (
    // pointerEvents on the wrapper, not a `disabled` prop: the native button has
    // no disabled state, and dimming it while the Clerk round-trip runs is what
    // stops a second sheet from being requested mid-flight.
    <View
      style={[styles.wrap, disabled && styles.disabled]}
      pointerEvents={disabled ? "none" : "auto"}
    >
      <AppleAuthenticationButton
        buttonType={
          intent === "signUp"
            ? AppleAuthenticationButtonType.SIGN_UP
            : AppleAuthenticationButtonType.SIGN_IN
        }
        // WHITE on the near-black app background; BLACK would vanish into it.
        buttonStyle={AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={14}
        onPress={onPress}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  disabled: { opacity: 0.4 },
  // The native button renders at zero size without explicit dimensions. 52pt is
  // the primary Button's height, so Apple's option is never the small one —
  // Guideline 4.8 wants it presented as an equal, and it leads the row.
  button: { width: "100%", height: 52 },
});
