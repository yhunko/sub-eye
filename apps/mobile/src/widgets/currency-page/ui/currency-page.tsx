import { getLocales } from "expo-localization";
import { useEffect, useMemo } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import {
  currencyFlag,
  currencyName,
  currencySymbol,
  POPULAR_CURRENCY_CODES,
  supportedCurrencyCode,
} from "@/shared/lib/format";
import { RowCheck } from "@/shared/ui/list-row";
import { colors } from "@/shared/ui/theme";
import { currencySearch, useCurrencySearch } from "../model/search-store";
import { currencySections } from "../model/sections";

/**
 * One screen doing two jobs, the same way `categories-page` is Settings →
 * Categories *and* the form's category step: this is Settings → Currency *and*
 * the price field's currency. The two live in different stacks, so the app
 * layer wires each of them (`app/currency.tsx`,
 * `app/subscription-form/currency.tsx`) — a widget importing a sibling widget
 * is the one edge FSD has no room for. Both routes are outside the tab tree, so
 * neither renders under the floating tab bar.
 *
 * Its chrome — the title and the search field — is declared on each route's
 * LAYOUT rather than here. None of it depends on anything this screen holds, and
 * options set from inside a screen are re-pushed through `navigation.setOptions`
 * on every render, which for a search field is one `UISearchController` rebuild
 * per keystroke.
 *
 * It replaces an `ActionSheetIOS` over five hard-coded codes. An action sheet
 * cannot search, cannot group, and stops being a list at all somewhere around a
 * dozen rows — the catalogue is 156.
 */
export function CurrencyPage({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (currencyCode: string) => void;
}) {
  const search = useCurrencySearch();

  // The store outlives this screen, the native field does not — it comes back
  // empty. Clearing on the way out is what stops the next visit opening
  // pre-filtered by a term with nothing on screen to explain it.
  useEffect(() => () => currencySearch.set(""), []);

  const suggested = useMemo(() => {
    // The current choice leads, so the checkmark is on screen before anything is
    // scrolled; the device's own currency follows, because it is the only entry
    // here that is not a guess about who is holding the phone.
    const device = supportedCurrencyCode(getLocales()[0]?.currencyCode);
    const codes = [selected.trim().toLowerCase(), device].concat(
      POPULAR_CURRENCY_CODES,
    );

    return [...new Set(codes)].filter(
      (code): code is string => !!code && currencyName(code) !== undefined,
    );
  }, [selected]);

  const sections = useMemo(
    () =>
      currencySections({
        search,
        suggested,
        suggestedTitle: m.currency_suggested(),
        resultsTitle: m.currency_results(),
      }),
    [search, suggested],
  );

  return (
    <SectionList
      sections={sections}
      // Namespaced by the section behind our back (VirtualizedSectionList
      // prefixes the section key), so a code appearing in both Suggested and its
      // own letter is not a duplicate key.
      keyExtractor={(code) => code}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      // Inset-grouped cards, not a plain indexed list: a heading that sticks
      // hangs over the rounded top of the card below it.
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.content}
      renderSectionHeader={({ section }) => (
        <Text
          style={[
            styles.heading,
            // The first heading's top margin is separation between two cards,
            // and there is no card above it — only the search field, which
            // brings its own. Left in, it read as a hole under the field.
            section === sections[0] && styles.headingFirst,
          ]}
        >
          {section.title}
        </Text>
      )}
      renderItem={({ item, index, section }) => (
        <CurrencyRow
          code={item}
          selected={item === selected}
          first={index === 0}
          last={index === section.data.length - 1}
          onPress={() => onSelect(item)}
        />
      )}
      ListEmptyComponent={
        <Text style={styles.placeholder}>{m.currency_noResults()}</Text>
      }
    />
  );
}

/**
 * Flag, code, name, symbol — in that order because that is the order they are
 * scanned in. The flag is the fastest thing on the row to recognise and the
 * code is what the rest of the app prints, so the name is support rather than
 * the label.
 *
 * The card edge is carried by the FIRST and LAST row rather than by a wrapper:
 * a `SectionList` has no element around a section's items to put a border on.
 */
function CurrencyRow({
  code,
  selected,
  first,
  last,
  onPress,
}: {
  code: string;
  selected: boolean;
  first: boolean;
  last: boolean;
  onPress: () => void;
}) {
  const name = currencyName(code);
  const symbol = currencySymbol(code);

  return (
    <>
      {first ? null : <View style={styles.divider} />}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${code.toUpperCase()}${name ? `, ${name}` : ""}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          first && styles.rowFirst,
          last && styles.rowLast,
          selected && styles.rowSelected,
          pressed && styles.rowPressed,
        ]}
      >
        {/* A fixed column, and the one thing on the row that does not grow with
            Dynamic Type — the flags have to stay in a line for the codes beside
            them to. Same treatment as the category list's emoji. */}
        <Text style={styles.flag} maxFontSizeMultiplier={1}>
          {currencyFlag(code)}
        </Text>
        <View style={styles.text}>
          <Text style={[styles.code, selected && styles.codeSelected]}>
            {code.toUpperCase()}
          </Text>
          {name ? <Text style={styles.name}>{name}</Text> : null}
        </View>
        {/* Absent for the third of the catalogue whose "symbol" in CLDR is the
            code again — printing AED beside AED reads as a rendering bug. */}
        {symbol ? <Text style={styles.symbol}>{symbol}</Text> : null}
        <RowCheck checked={selected} />
      </Pressable>
    </>
  );
}

// Row padding (16) + flag column (30) + gap (12), so the rule starts under the
// code rather than under the flag.
const DIVIDER_INSET = 58;

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  heading: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 6,
  },
  headingFirst: { marginTop: 0 },
  // ponytail: the card is the rows' own background and end radii, with no 1px
  // outer border — a SectionList gives a section no element to draw one on, and
  // at rgba(255,255,255,0.10) over #171a20 it is not what makes the card read.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minHeight: 52,
    backgroundColor: colors.surface,
  },
  rowFirst: { borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  rowLast: { borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  rowSelected: { backgroundColor: colors.accentSoft },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: DIVIDER_INSET,
  },
  flag: { width: 30, fontSize: 25 },
  text: { flex: 1, minWidth: 0 },
  code: { fontSize: 16, color: colors.text },
  codeSelected: { fontWeight: "600", color: colors.accent },
  name: { marginTop: 1, fontSize: 12.5, color: colors.muted },
  symbol: { fontSize: 15, color: colors.muted },
  placeholder: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 14,
    color: colors.muted,
  },
});
