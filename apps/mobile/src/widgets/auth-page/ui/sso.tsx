import { useSSO } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { m } from "@/shared/i18n";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Button } from "@/shared/ui/button";
import { colors } from "@/shared/ui/theme";

const APP_MARK = require("../../../../assets/icon.png");

// Closes the browser tab left behind when the provider redirects back. Must run
// at module scope — by the time a component mounts, the redirect has landed.
WebBrowser.maybeCompleteAuthSession();

export type SsoProvider = "google" | "github";

const STRATEGY = {
  google: "oauth_google",
  github: "oauth_github",
} as const;

const DOMAIN = { google: "google.com", github: "github.com" } as const;
const LABEL = { google: "Google", github: "GitHub" } as const;

export function useSso(onError: (message: string) => void) {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [pending, setPending] = useState<SsoProvider | null>(null);

  useEffect(() => {
    // Android's Custom Tabs bind lazily; warming the service up front removes a
    // visible stall between the tap and the browser appearing. No-op elsewhere.
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const start = async (provider: SsoProvider) => {
    if (pending) return;
    setPending(provider);
    try {
      const { createdSessionId, setActive, authSessionResult } =
        await startSSOFlow({
          strategy: STRATEGY[provider],
          // Must also be registered under Native Applications → Redirect URLs in
          // the Clerk Dashboard. Without it the provider authenticates fine and
          // Clerk silently never creates the session.
          redirectUrl: Linking.createURL("/sso-callback"),
        });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        // These screens live outside the tab tree, so flipping isSignedIn is not
        // enough on its own — the auth stack has to be replaced.
        router.replace("/");
        return;
      }

      // No session and no throw: the user backed out of the browser, or the
      // provider needs more information than the flow collected.
      if (
        authSessionResult?.type === "cancel" ||
        authSessionResult?.type === "dismiss"
      ) {
        onError(m.auth_ssoCancelled({ provider: LABEL[provider] }));
        return;
      }
      onError(m.auth_ssoFailed({ provider: LABEL[provider] }));
    } catch {
      onError(m.auth_ssoFailed({ provider: LABEL[provider] }));
    } finally {
      setPending(null);
    }
  };

  return {
    pending,
    start: (provider: SsoProvider) => void start(provider),
    cancel: () => WebBrowser.dismissAuthSession(),
  };
}

export function SsoRow({
  onStart,
  disabled,
}: {
  onStart: (provider: SsoProvider) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      {(["google", "github"] as const).map((provider) => (
        <View key={provider} style={styles.cell}>
          <Button
            variant="secondary"
            disabled={disabled}
            label={LABEL[provider]}
            onPress={() => onStart(provider)}
            icon={
              <BrandLogo
                name={LABEL[provider]}
                brandDomain={DOMAIN[provider]}
                size={18}
              />
            }
          />
        </View>
      ))}
    </View>
  );
}

/** Screen 06: what the user sees behind the provider's browser sheet. */
export function SsoHandoff({
  provider,
  onCancel,
}: {
  provider: SsoProvider;
  onCancel: () => void;
}) {
  return (
    <View style={styles.handoff}>
      <View style={styles.handoffBody}>
        <View style={styles.tiles}>
          <View style={styles.tile}>
            <Image
              accessibilityIgnoresInvertColors
              source={APP_MARK}
              style={styles.tileMark}
            />
          </View>
          <View style={styles.link} />
          <View style={styles.tile}>
            <BrandLogo
              name={LABEL[provider]}
              brandDomain={DOMAIN[provider]}
              size={30}
            />
          </View>
        </View>
        <View style={styles.handoffText}>
          <Text style={styles.handoffTitle}>
            {m.auth_ssoOpening({ provider: LABEL[provider] })}
          </Text>
          <Text style={styles.handoffBlurb}>{m.auth_ssoOpeningHint()}</Text>
        </View>
        <ActivityIndicator color={colors.accent} />
      </View>
      <Button variant="plain" label={m.common_cancel()} onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  cell: { flex: 1 },
  handoff: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 22,
  },
  handoffBody: { alignItems: "center", gap: 22 },
  tiles: { flexDirection: "row", alignItems: "center", gap: 16 },
  tile: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileMark: { width: 36, height: 36, borderRadius: 12 },
  link: {
    width: 44,
    height: 2,
    borderRadius: 999,
    backgroundColor: colors.borderStrong,
  },
  handoffText: { alignItems: "center", gap: 8 },
  handoffTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  handoffBlurb: {
    maxWidth: 250,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colors.muted,
  },
});
