import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { categoriesQuery } from "@/entities/category";
import {
  hasActiveFilters,
  type SubscriptionSort,
  type SubscriptionStatusFilter,
  subscriptionFilters,
  useSubscriptionFilters,
} from "@/entities/subscription";
import { m } from "@/shared/i18n";
import { colors, LAYOUT_FONT_SCALE_MAX } from "@/shared/ui/theme";

// Message-function references, invoked at render — never m.*() at module scope.
const STATUSES: { value: SubscriptionStatusFilter; label: () => string }[] = [
  { value: "all", label: m.subs_status_all },
  { value: "active", label: m.subs_status_active },
  { value: "paused", label: m.subs_status_paused },
  { value: "cancelling", label: m.subs_status_cancelling },
  { value: "cancelled", label: m.subs_status_cancelled },
];

const SORTS: { value: SubscriptionSort; label: () => string }[] = [
  { value: "next", label: m.subs_sort_next },
  { value: "name", label: m.subs_sort_name },
  { value: "cost", label: m.subs_sort_cost },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

/** A choice row. The checkmark is the only selected-state affordance, as in Settings. */
function ChoiceRow({
  label,
  selected,
  first,
  onPress,
}: {
  label: string;
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
        <Text
          style={[styles.rowLabel, selected && styles.rowLabelSelected]}
          numberOfLines={1}
          maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
        >
          {label}
        </Text>
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

/**
 * Every list filter, in one native sheet behind one header button.
 *
 * Replaces three pinned chip strips. Those cost ~130pt of permanently sticky
 * chrome above a list, and they only got worse as dimensions were added — the
 * category strip was the third. Rows in a sheet scale to any number of
 * categories; a horizontal strip does not.
 *
 * Choices apply immediately, so there is no Cancel and nothing to commit. Done
 * is here for discoverability — the grabber and a swipe do the same thing.
 */
export function SubscriptionFiltersSheet() {
  const router = useRouter();
  const filters = useSubscriptionFilters();
  const categories = useQuery(categoriesQuery());
  const rows = categories.data ?? [];

  return (
    // Title INSIDE the scroller, as in every other sheet here. A fixed header
    // above a ScrollView overlapped the first section: the scroll content laid
    // out from the sheet's top edge rather than below the header.
    <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{m.subs_filterTitle()}</Text>
        {hasActiveFilters(filters) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => subscriptionFilters.reset()}
            hitSlop={12}
          >
            <Text style={styles.reset}>{m.subs_filterReset()}</Text>
          </Pressable>
        ) : null}
      </View>

      <Section title={m.subs_filterStatus()}>
        {STATUSES.map((option, index) => (
          <ChoiceRow
            key={option.value}
            label={option.label()}
            selected={filters.status === option.value}
            first={index === 0}
            onPress={() => subscriptionFilters.set({ status: option.value })}
          />
        ))}
      </Section>

      <Section title={m.subs_filterSort()}>
        {SORTS.map((option, index) => (
          <ChoiceRow
            key={option.value}
            label={option.label()}
            selected={filters.sort === option.value}
            first={index === 0}
            onPress={() => subscriptionFilters.set({ sort: option.value })}
          />
        ))}
      </Section>

      {/* Omitted entirely for an account with no categories — a lone
            "All categories" row filters nothing. */}
      {rows.length ? (
        <Section title={m.form_category()}>
          <ChoiceRow
            label={m.subs_categoryAll()}
            selected={filters.categoryId === null}
            first
            onPress={() => subscriptionFilters.set({ categoryId: null })}
          />
          {rows.map((category) => (
            <ChoiceRow
              key={category.id}
              label={`${category.emoji} ${category.name}`}
              selected={filters.categoryId === category.id}
              first={false}
              onPress={() =>
                subscriptionFilters.set({ categoryId: category.id })
              }
            />
          ))}
        </Section>
      ) : null}

      <Pressable
        accessibilityRole="button"
        style={styles.done}
        onPress={() => router.back()}
      >
        <Text style={styles.doneLabel}>{m.common_done()}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  reset: { fontSize: 15, fontWeight: "600", color: colors.accent },
  content: { padding: 20, paddingBottom: 40, gap: 20 },

  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 4,
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
    minHeight: 48,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowLabel: { flex: 1, fontSize: 16, color: colors.text },
  rowLabelSelected: { fontWeight: "600", color: colors.accent },

  done: {
    marginTop: 4,
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
  },
  doneLabel: { fontSize: 15, fontWeight: "700", color: colors.bg },
});
