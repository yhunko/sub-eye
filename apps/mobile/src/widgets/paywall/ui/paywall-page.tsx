import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchProPackage,
  purchasePro,
  restorePro,
  usePro,
} from "@/entities/pro";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";
import { FeatureRail } from "./feature-rail";

/**
 * The one purchase: SubEye Pro, non-consumable, bought once.
 *
 * The price is whatever the storefront says (`pkg.product.priceString`) and is
 * never hardcoded — $11.99 is wrong in Ukraine and looks illegal everywhere
 * else. `apps/landing/src/lib/site.ts` states the marketing figure; this screen
 * states the real one.
 */
export function PaywallPage() {
  const router = useRouter();
  const isPro = usePro();
  const insets = useSafeAreaInsets();
  // Past the accessibility sizes the purchase block alone is taller than the
  // screen, so pinning it puts Restore and the legal links where nothing can
  // reach them. There it goes back into the scroller with everything else.
  const stacked = useLargeText();
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchProPackage()
      // An unreachable store is the same as an empty offering here: there is
      // nothing to sell, and the screen says so rather than showing a dead button.
      .catch(() => null)
      .then((found) => {
        if (cancelled) return;
        setPkg(found);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Never a bare router.back(): the locked widget deep-links straight here, and
  // a modal that IS the whole stack has no navigator to hand GO_BACK to.
  const dismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const buy = async () => {
    if (!pkg) return;
    setBusy(true);
    try {
      // `false` is a cancellation — a no-op, never an error toast.
      if (await purchasePro(pkg)) dismiss();
    } catch {
      Alert.alert(m.paywall_purchaseFailed());
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      if (await restorePro()) {
        Alert.alert(m.paywall_restoreDone());
        dismiss();
      } else {
        Alert.alert(m.paywall_restoreNone());
      }
    } catch {
      // A throw is the store failing to answer, NOT an answer of "nothing to
      // restore" — telling a paying customer their purchase does not exist is
      // how a transient outage becomes a refund request.
      Alert.alert(m.paywall_restoreFailed());
    } finally {
      setBusy(false);
    }
  };

  // Rendered either pinned under the scroller or inside it — see `stacked`.
  const purchase = (
    <>
      {/* Not a sixth page, and pinned WITH the price rather than left at the
            end of the pitch: it is the reason this is a one-time purchase
            rather than a subscription, so it only does its job while the
            figure it qualifies is on screen beside it. */}
      <Text style={styles.support}>{m.paywall_featureSupportBody()}</Text>

      {isPro ? (
        <Text style={styles.owned}>{m.paywall_owned()}</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      ) : pkg ? (
        <>
          <Button
            label={m.paywall_buy({ price: pkg.product.priceString })}
            busy={busy}
            onPress={() => void buy()}
          />
          <Text style={styles.footnote}>{m.paywall_oneTime()}</Text>
        </>
      ) : (
        <Text style={styles.footnote}>{m.paywall_unavailable()}</Text>
      )}

      {/* Mandatory (Guideline 3.1.1), and it stays reachable even while the
          offering is still loading — a reviewer who cannot find Restore
          rejects the build. Settings carries the same action. */}
      <Button
        label={m.paywall_restore()}
        variant="plain"
        disabled={busy}
        onPress={() => void restore()}
      />

      {/* A column at the accessibility sizes: side by side these two run off
          BOTH edges — there is no wrap in a row — and a clipped Privacy policy
          link is the one thing on this screen a reviewer is guaranteed to
          look for. The middle dot goes with the row it separated. */}
      <View style={[styles.legal, stacked && styles.legalStacked]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/legal/terms-of-service")}
          hitSlop={8}
        >
          <Text style={styles.legalLink}>{m.settings_terms()}</Text>
        </Pressable>
        {stacked ? null : <Text style={styles.legalDot}>·</Text>}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/legal/privacy-policy")}
          hitSlop={8}
        >
          <Text style={styles.legalLink}>{m.settings_privacy()}</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <>
      <Stack.Screen
        options={{
          ...nativeHeaderChrome,
          title: m.paywall_title(),
          headerLeft: () => (
            <Pressable
              onPress={dismiss}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={m.common_cancel()}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close" }}
                size={17}
                tintColor={colors.text}
                weight="semibold"
              />
            </Pressable>
          ),
        }}
      />
      <View style={styles.screen}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            stacked && { paddingBottom: insets.bottom + 24 },
          ]}
        >
          <Text style={styles.headline}>{m.paywall_subtitle()}</Text>

          <FeatureRail />

          {stacked ? purchase : null}
        </ScrollView>

        {stacked ? null : (
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 14) },
            ]}
          >
            {purchase}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  // The pitch scrolls, the footer does not. At the default text size there is
  // nothing to scroll and the whole screen is one view; at the accessibility
  // sizes this is what gives, rather than the text being capped — which is the
  // thing that fails Apple's Larger Text criterion.
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 14,
  },
  footer: { paddingHorizontal: 20, paddingTop: 6, gap: 12 },

  headline: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.text,
  },

  support: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.muted,
    textAlign: "center",
    paddingHorizontal: 4,
  },

  spinner: { paddingVertical: 14 },
  owned: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.accent,
    textAlign: "center",
    paddingVertical: 12,
  },
  footnote: { fontSize: 12.5, color: colors.muted, textAlign: "center" },

  legal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  legalStacked: { flexDirection: "column", gap: 12 },
  legalLink: { fontSize: 13, color: colors.muted, textAlign: "center" },
  legalDot: { fontSize: 13, color: colors.muted },
});
