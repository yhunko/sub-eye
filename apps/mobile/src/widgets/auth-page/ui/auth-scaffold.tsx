import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { m } from "@/shared/i18n";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

const APP_MARK = require("../../../../assets/icon.png");

/**
 * The frame every auth screen shares: safe area, keyboard avoidance, the title
 * block, and a footer pinned to the bottom of the scroll content.
 *
 * These screens sit OUTSIDE the tab tree and have no native header, so unlike
 * the rest of the app they own their own insets — `contentInsetAdjustmentBehavior`
 * has nothing to adjust against here.
 */
export function AuthScaffold({
  back = false,
  onBack,
  brand = false,
  banner,
  title,
  subtitle,
  footer,
  children,
}: {
  back?: boolean;
  /** Overrides the default `router.back()` — used to step back WITHIN a flow. */
  onBack?: () => void;
  brand?: boolean;
  /** Rendered above the title — the SSO failure banner. */
  banner?: ReactNode;
  title: string;
  /** Nodes allowed so a screen can highlight part of the sentence inline. */
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // The footer links REPLACE rather than push, so sign-in ↔ sign-up cannot stack
  // up — which means a screen reached that way has nothing to go back to and a
  // bare router.back() throws "GO_BACK was not handled by any navigator". Every
  // screen here sits under sign-in, so that is the floor.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/sign-in");
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 14 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={m.auth_back()}
            hitSlop={8}
            onPress={onBack ?? goBack}
            style={({ pressed }) => [
              styles.back,
              pressed && styles.backPressed,
            ]}
          >
            <SymbolView
              name={{ ios: "chevron.left", android: "chevron_left" }}
              size={20}
              tintColor={colors.text}
            />
          </Pressable>
        ) : null}

        {brand ? (
          <View style={styles.brand}>
            <Image
              accessibilityIgnoresInvertColors
              source={APP_MARK}
              style={styles.brandMark}
            />
            <Text
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
              style={styles.brandName}
            >
              SubEye
            </Text>
          </View>
        ) : null}

        {banner}

        <Text
          maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
          style={[styles.title, banner ? styles.titleAfterBanner : null]}
        >
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        <View style={styles.body}>{children}</View>

        {/* Pushes the footer to the bottom when the content is short, and lets it
            follow the content down when the keyboard shrinks the viewport. */}
        <View style={styles.spacer} />
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 20 },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 20,
  },
  backPressed: { backgroundColor: colors.surfaceAlt },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 34,
  },
  brandMark: { width: 30, height: 30, borderRadius: 10 },
  brandName: { fontSize: 17, fontWeight: "700", color: colors.text },
  title: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 34,
    letterSpacing: -0.6,
    color: colors.text,
  },
  titleAfterBanner: { marginTop: 26 },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
  },
  body: { marginTop: 28 },
  spacer: { flex: 1, minHeight: 24 },
});
