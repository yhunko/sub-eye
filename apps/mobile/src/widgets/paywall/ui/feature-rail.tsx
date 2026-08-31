import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import type { ComponentType } from "react";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import {
  CategoriesPreview,
  PricingPreview,
  RemindersPreview,
  WidgetsPreview,
} from "./feature-previews";

// Message-function references, invoked at render — never m.*() at module scope.
const FEATURES: {
  ios: SFSymbol;
  android: AndroidSymbol;
  label: () => string;
  body: () => string;
  Preview: ComponentType;
}[] = [
  {
    ios: "bell.badge",
    android: "notifications_active",
    label: m.paywall_featureReminders,
    body: m.paywall_featureRemindersBody,
    Preview: RemindersPreview,
  },
  {
    ios: "tag",
    android: "sell",
    label: m.paywall_featurePricing,
    body: m.paywall_featurePricingBody,
    Preview: PricingPreview,
  },
  {
    ios: "chart.pie",
    android: "pie_chart",
    label: m.paywall_featureCategories,
    body: m.paywall_featureCategoriesBody,
    Preview: CategoriesPreview,
  },
  // The widget's own lock card is the surface that deep-links here, so the
  // screen it lands on has to name it. Same string that card renders.
  {
    ios: "square.grid.2x2",
    android: "widgets",
    label: m.paywall_lockWidgets,
    body: m.paywall_lockWidgetsBody,
    Preview: WidgetsPreview,
  },
];

/**
 * What Pro buys, one page at a time.
 *
 * A rail rather than a list because the list could not win either way: with a
 * sentence under every name it ran past the fold and pushed the price, Restore
 * and the legal links off the screen; trimmed to five bare names it fitted and
 * then said almost nothing, in the middle of a lot of empty. A page shows the
 * shape of the feature, which is the one thing a name cannot.
 *
 * The art height follows the SCREEN, not a constant. This is the whole reason
 * the rail fits everywhere: it is what absorbs the slack on a tall phone and
 * gives it back on a short one, so the buy button stays above the fold on both
 * without anything being capped.
 */
export function FeatureRail() {
  const { width, height } = useWindowDimensions();
  const [page, setPage] = useState(0);

  // The page is the full content width, so paging lands each preview exactly
  // in the frame — no snap offsets to keep in step with a gap.
  const pageWidth = width - PAGE_PADDING * 2;
  const artHeight = Math.round(Math.min(240, Math.max(132, height * 0.26)));

  return (
    <View style={styles.rail}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // The paywall's vertical scroll view takes UIKit's automatic safe-area
        // inset. Without this the nested horizontal one takes it too and starts
        // the rail pushed in by the status bar's height.
        automaticallyAdjustContentInsets={false}
        onMomentumScrollEnd={(event) =>
          setPage(
            Math.round(event.nativeEvent.contentOffset.x / (pageWidth || 1)),
          )
        }
        style={{ width: pageWidth }}
      >
        {FEATURES.map((feature) => (
          <View key={feature.ios} style={[styles.page, { width: pageWidth }]}>
            <View style={[styles.art, { height: artHeight }]}>
              <feature.Preview />
            </View>
            <View style={styles.caption}>
              <SymbolView
                name={{ ios: feature.ios, android: feature.android }}
                size={17}
                tintColor={colors.accent}
              />
              <Text style={styles.label}>{feature.label()}</Text>
            </View>
            <Text style={styles.body}>{feature.body()}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {FEATURES.map((feature, index) => (
          <View
            key={feature.ios}
            style={[styles.dot, index === page && styles.dotOn]}
          />
        ))}
      </View>
    </View>
  );
}

/** The paywall's own horizontal padding, which the rail has to fill inside. */
const PAGE_PADDING = 20;

const styles = StyleSheet.create({
  rail: { alignItems: "center", gap: 14 },
  page: { alignItems: "center", gap: 13 },
  art: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    overflow: "hidden",
  },
  caption: { flexDirection: "row", alignItems: "center", gap: 9 },
  label: {
    flexShrink: 1,
    fontSize: 16.5,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  body: {
    marginTop: -4,
    maxWidth: 320,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.muted,
    textAlign: "center",
  },
  dots: { flexDirection: "row", gap: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.borderStrong,
  },
  dotOn: { backgroundColor: colors.accent },
});
