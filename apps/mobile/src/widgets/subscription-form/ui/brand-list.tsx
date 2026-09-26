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
import { colors } from "@/shared/ui/theme";
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
 *
 * THE TWENTY BRANDS ARE A SHORTLIST AND THE SCREEN HAS TO SAY SO. This is step
 * one of the form, so it is the first thing anyone sees, and a card of twenty
 * logos with a collapsed magnifier in the nav bar above it reads as the whole
 * catalogue — people picked "No logo" for services that search finds instantly.
 * Three things carry that now, and all three have to survive an edit: the lead
 * line ABOVE the card (it used to sit under twenty rows, which is below the
 * fold and therefore nowhere), the "Popular" heading that names the card as a
 * subset, and an explicit empty state, because a search that answers with an
 * unchanged-looking screen is a search that looks broken — which teaches
 * exactly the lesson the other two undo.
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

  // Search mode is decided by what is TYPED, not by the debounced needle. Both
  // answer "is the user searching", but the needle answers it 300ms late — and
  // in that window the popular shortlist was still on screen under a typed
  // query, which reads as "here are your matches" for things that never
  // matched. The spinner covers the gap instead.
  const typed = search.trim();
  const searching = typed.length >= 2;
  const rows = searching ? hits : POPULAR_BRANDS;
  const pending = results.isFetching || (searching && needle !== typed);

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
      {/* Hidden once they are searching: by then the screen has answered the
          question this sentence exists to pre-empt. */}
      {searching ? null : (
        <View style={styles.lead}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search" }}
            size={15}
            tintColor={colors.muted}
          />
          <Text style={styles.leadText}>{m.form_brandHint()}</Text>
        </View>
      )}

      {/* Its own card, above the heading: it is a choice about this
          subscription rather than a member of either list, and inside the card
          it was the row a "Popular" heading would have been lying about. */}
      <View style={styles.group}>
        <Row
          first
          selected={picked === ""}
          onPress={() => choose("")}
          label={m.form_brandNone()}
        />
      </View>

      {rows.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {searching ? m.form_brandResults() : m.form_brandPopular()}
          </Text>
          <View style={styles.group}>
            {rows.map((row, index) => (
              <Row
                key={row.domain}
                first={index === 0}
                selected={picked === row.domain}
                onPress={() => choose(row.domain, row.name)}
                label={row.name}
                caption={row.domain}
                logo={
                  <BrandLogo
                    name={row.name}
                    brandDomain={row.domain}
                    size={28}
                  />
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      {pending ? (
        <ActivityIndicator color={colors.muted} style={styles.spinner} />
      ) : null}

      {/* The whole point of the empty state: without it a miss looks identical
          to a screen that never ran the search, and the domain row below only
          appears for something that already parses as a host — so "My gym"
          returned nothing at all and no way forward. */}
      {searching && !pending && rows.length === 0 ? (
        <Text style={styles.hint}>
          {results.isError
            ? m.form_brandSearchFailed()
            : m.form_brandNoResults({ query: typed })}
        </Text>
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
          <Text style={styles.useTyped}>
            {m.form_brandUse({ domain: typedDomain })}
          </Text>
        </Pressable>
      ) : null}
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
          <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>
            {label}
          </Text>
          {caption ? <Text style={styles.rowCaption}>{caption}</Text> : null}
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
  lead: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 4 },
  leadText: { flex: 1, fontSize: 12.5, lineHeight: 17, color: colors.muted },
  section: { gap: 6 },
  sectionTitle: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
  },
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
    paddingVertical: 10,
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
