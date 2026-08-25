import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { type ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { m } from "@/shared/i18n";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { nativeSearchBarChrome } from "@/shared/ui/header";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";
import { brandSearchQuery, POPULAR_BRANDS } from "../model/brand-search";
import { useSubscriptionForm } from "../model/form-context";
import { normalizeBrandDomain } from "../model/form-schema";

/**
 * Pick the service's logo by searching for it, instead of knowing its domain.
 *
 * This replaces a free-text "Website" field that asked the user to type
 * `netflix.com` from memory. Same drill-down mechanism as the category picker —
 * the form modal owns a stack, so this is a pushed screen with a real search bar
 * rather than a second sheet.
 *
 * Typing a domain by hand is still offered below the results — search misses
 * small services, and it is the whole screen if Brandfetch is ever unreachable
 * or starts refusing the anonymous requests it answers today.
 *
 * With nothing typed it shows `POPULAR_BRANDS`, which is what most people came
 * to pick and is also why the screen never opens empty.
 */
export function BrandPickerPage() {
  const router = useRouter();
  const { values, set } = useSubscriptionForm();
  const [search, setSearch] = useState("");
  const [needle, setNeedle] = useState("");

  // The first search box in the app that hits the network, and Brandfetch caps
  // an IP at 200 requests per 5 minutes — so the query trails the keystrokes.
  useEffect(() => {
    const timer = setTimeout(() => setNeedle(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const results = useQuery(brandSearchQuery(needle));
  const hits = results.data ?? [];

  // Below the query's own threshold there is nothing to search for, so the
  // screen shows the shortlist instead. Deliberately NOT a fallback for an
  // empty or in-flight result: popular brands appearing under a typed query
  // reads as "here are your matches" for things that never matched.
  const searching = needle.length >= 2;
  const rows = searching ? hits : POPULAR_BRANDS;

  // Offered whenever what they typed is a plausible host and no result already
  // is it — search misses plenty of small services, and the field this screen
  // replaced could at least take a domain.
  const typedDomain = normalizeBrandDomain(needle);
  const canUseTyped =
    typedDomain !== null && !hits.some((hit) => hit.domain === typedDomain);

  const choose = (domain: string, brandName?: string) => {
    set("brandDomain", domain);
    // Only into an empty field: picking a brand should never overwrite a name
    // the user has already typed.
    if (brandName && values.name.trim() === "") set("name", brandName);
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: m.form_brand(),
          headerSearchBarOptions: {
            ...nativeSearchBarChrome,
            placeholder: m.form_brandSearch(),
            onChangeText: (event) => setSearch(event.nativeEvent.text),
          },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.group}>
          <Row
            first
            selected={values.brandDomain.trim() === ""}
            onPress={() => choose("")}
            label={m.form_brandNone()}
          />
          {rows.map((row) => (
            <Row
              key={row.domain}
              first={false}
              selected={values.brandDomain.trim() === row.domain}
              onPress={() => choose(row.domain, row.name)}
              label={row.name}
              caption={row.domain}
              logo={
                <BrandLogo name={row.name} brandDomain={row.domain} size={28} />
              }
            />
          ))}
        </View>

        {results.isFetching ? (
          <ActivityIndicator color={colors.muted} style={styles.spinner} />
        ) : null}

        {canUseTyped ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => choose(typedDomain)}
            style={({ pressed }) => [
              styles.group,
              styles.row,
              pressed && styles.rowPressed,
            ]}
          >
            <SymbolView
              name={{ ios: "link", android: "link" }}
              size={19}
              tintColor={colors.accent}
            />
            <Text
              style={styles.useTyped}
              numberOfLines={1}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {m.form_brandUse({ domain: typedDomain })}
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.hint}>{m.form_brandHint()}</Text>
      </ScrollView>
    </>
  );
}

function Row({
  label,
  caption,
  logo,
  selected,
  first,
  onPress,
}: {
  label: string;
  caption?: string;
  logo?: ReactNode;
  selected: boolean;
  first: boolean;
  onPress: () => void;
}) {
  return (
    <>
      {first ? null : <View style={styles.divider} />}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        {logo}
        <View style={styles.rowText}>
          <Text
            style={[styles.rowLabel, selected && styles.rowLabelSelected]}
            numberOfLines={1}
            maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
          >
            {label}
          </Text>
          {caption ? (
            <Text
              style={styles.rowCaption}
              numberOfLines={1}
              maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
            >
              {caption}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <SymbolView
            name={{ ios: "checkmark", android: "check" }}
            size={15}
            tintColor={colors.accent}
            weight="semibold"
          />
        ) : null}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16, color: colors.text },
  rowLabelSelected: { fontWeight: "600", color: colors.accent },
  rowCaption: { fontSize: 12.5, color: colors.muted },
  useTyped: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.accent },
  hint: {
    paddingHorizontal: 4,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.muted,
  },
  spinner: { marginTop: 4 },
});
