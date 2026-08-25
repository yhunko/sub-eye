import { useQuery } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { type ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { m } from "@/shared/i18n";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";
import { brandSearchQuery, POPULAR_BRANDS } from "../model/brand-search";
import { useSubscriptionForm } from "../model/form-context";
import { normalizeBrandDomain } from "../model/form-schema";

/**
 * The searchable brand list, without any chrome of its own.
 *
 * `search` comes from a real `UISearchBar` in the nav bar, which only a SCREEN
 * can declare — so the field lives with whoever hosts this list (step one of
 * the form, and the Brand tab when editing) and the list only sees the text.
 *
 * A chosen brand can be tapped again to UNPICK it. The checkmark is a toggle,
 * not a one-way door: without it "No logo" was the only way back, and a user who
 * picked the wrong brand had no reason to look for it there.
 */
export function BrandList({
  search,
  onPicked,
}: {
  search: string;
  /** Called after a row is tapped — the pushed picker uses it to pop. */
  onPicked?: () => void;
}) {
  const { values, set } = useSubscriptionForm();
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
  // list shows the shortlist instead. Deliberately NOT a fallback for an empty
  // or in-flight result: popular brands appearing under a typed query reads as
  // "here are your matches" for things that never matched.
  const rows = needle.length >= 2 ? hits : POPULAR_BRANDS;

  // Offered whenever what they typed is a plausible host and no result already
  // is it — search misses plenty of small services, and the field this screen
  // replaced could at least take a domain.
  const typedDomain = normalizeBrandDomain(needle);
  const canUseTyped =
    typedDomain !== null && !hits.some((hit) => hit.domain === typedDomain);

  const picked = values.brandDomain.trim();

  const choose = (domain: string, brandName?: string) => {
    if (domain !== "" && domain === picked) {
      set("brandDomain", "");
      // Undo the prefill with it, but only while it is still untouched —
      // unticking a logo must not delete a name the user typed themselves.
      if (brandName && values.name.trim() === brandName) set("name", "");
    } else {
      set("brandDomain", domain);
      // Only into an empty field: picking a brand should never overwrite a name
      // the user has already typed.
      if (brandName && values.name.trim() === "") set("name", brandName);
    }
    onPicked?.();
  };

  return (
    <>
      <View style={styles.group}>
        <Row
          first
          selected={picked === ""}
          onPress={() => choose("")}
          label={m.form_brandNone()}
        />
        {rows.map((row) => (
          <Row
            key={row.domain}
            first={false}
            selected={picked === row.domain}
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
        style={({ pressed }) => [
          styles.row,
          selected && styles.rowSelected,
          pressed && styles.rowPressed,
        ]}
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
  rowSelected: { backgroundColor: colors.accentSoft },
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
