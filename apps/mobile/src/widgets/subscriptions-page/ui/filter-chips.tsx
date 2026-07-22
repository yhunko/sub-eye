import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import type {
  SubscriptionSort,
  SubscriptionStatusFilter,
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

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text
        style={[styles.chipText, active && styles.chipTextActive]}
        maxFontSizeMultiplier={LAYOUT_FONT_SCALE_MAX}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ponytail: two horizontal chip rows instead of a filter sheet with a segmented
// control and a sort menu. Five statuses and three sorts fit; a sheet is a screen
// the user has to open, decide in, and dismiss.
export function FilterChips({
  status,
  sort,
  onStatus,
  onSort,
}: {
  status: SubscriptionStatusFilter;
  sort: SubscriptionSort;
  onStatus: (value: SubscriptionStatusFilter) => void;
  onSort: (value: SubscriptionSort) => void;
}) {
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {STATUSES.map((option) => (
          <Chip
            key={option.value}
            label={option.label()}
            active={status === option.value}
            onPress={() => onStatus(option.value)}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {SORTS.map((option) => (
          <Chip
            key={option.value}
            label={option.label()}
            active={sort === option.value}
            onPress={() => onSort(option.value)}
          />
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  strip: {
    gap: 8,
    // The strip itself is full-bleed so chips scroll off under the screen edge;
    // this is what puts them back in line with the rows below.
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  chipTextActive: {
    color: colors.accent,
  },
});
