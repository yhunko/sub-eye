import { Stack, useRouter } from "expo-router";
import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
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
import type { PurchasesPackage } from "react-native-purchases";
import {
  fetchProPackage,
  purchasePro,
  restorePro,
  usePro,
} from "@/entities/pro";
import { privacyUrl, termsUrl } from "@/shared/config/legal";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { nativeHeaderChrome } from "@/shared/ui/header";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// Message-function references, invoked at render — never m.*() at module scope.
const FEATURES: {
  ios: SFSymbol;
  android: AndroidSymbol;
  title: () => string;
  body: () => string;
}[] = [
  {
    ios: "bell.badge",
    android: "notifications_active",
    title: m.paywall_featureReminders,
    body: m.paywall_featureRemindersBody,
  },
  {
    ios: "tag",
    android: "sell",
    title: m.paywall_featurePricing,
    body: m.paywall_featurePricingBody,
  },
  {
    ios: "chart.pie",
    android: "pie_chart",
    title: m.paywall_featureCategories,
    body: m.paywall_featureCategoriesBody,
  },
  // The widget's own lock card is the surface that deep-links here, so the
  // screen it lands on has to name it. Same strings that card renders.
  {
    ios: "square.grid.2x2",
    android: "widgets",
    title: m.paywall_lockWidgets,
    body: m.paywall_lockWidgetsBody,
  },
];

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
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.headline}>{m.paywall_subtitle()}</Text>

        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <View key={feature.ios} style={styles.feature}>
              <SymbolView
                name={{ ios: feature.ios, android: feature.android }}
                size={20}
                tintColor={colors.accent}
                style={styles.featureIcon}
              />
              <View style={styles.featureText}>
                <Text
                  style={styles.featureTitle}
                  maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
                >
                  {feature.title()}
                </Text>
                <Text style={styles.featureBody}>{feature.body()}</Text>
              </View>
            </View>
          ))}
        </View>

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

        <View style={styles.legal}>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(termsUrl())}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{m.settings_terms()}</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(privacyUrl())}
            hitSlop={8}
          >
            <Text style={styles.legalLink}>{m.settings_privacy()}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40, gap: 16 },

  headline: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.text,
  },

  features: {
    gap: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 18,
  },
  feature: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  featureIcon: { marginTop: 1 },
  featureText: { flex: 1, minWidth: 0, gap: 3 },
  featureTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  featureBody: { fontSize: 13.5, lineHeight: 19, color: colors.muted },

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
  legalLink: { fontSize: 13, color: colors.muted },
  legalDot: { fontSize: 13, color: colors.muted },
});
