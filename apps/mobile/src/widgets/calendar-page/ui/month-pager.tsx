import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCalendarMonth } from "@/entities/calendar";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";
import { monthGrid, monthIso } from "../model/month";
import type { CalendarSettings } from "../model/settings";
import { Agenda } from "./agenda";
import { MonthCells } from "./month-grid";

/**
 * How far the pager reaches either way, in months.
 *
 * A window rather than an endlessly recycled three pages: recycling means
 * resetting `contentOffset` the instant a page settles, which fights the
 * scroller it is resetting. Four years is further than anyone swipes, the list
 * virtualises so only the pages either side of the current one are mounted, and
 * the arrows and Today keep the far ends reachable in one tap anyway.
 */
const REACH = 24;
const PAGES = REACH * 2 + 1;
const OFFSETS = Array.from({ length: PAGES }, (_, index) => index - REACH);

/** Clears the floating tab bar, which no automatic inset reaches in here. */
const TAB_BAR_CLEARANCE = 76;

/**
 * ONE month: its total, its grid and its agenda, in a scroller of its own.
 *
 * The agenda lives in here rather than under the pager, and that is the whole
 * point of this file's shape. Below it, the list could only ever dim and slide
 * a little while still showing the month being swiped AWAY from, then swap its
 * contents the instant the grid settled — the grid paged between two months
 * while the list underneath said something else. Inside, the next month's list
 * arrives with the next month's grid because they are the same surface, and
 * there is no animation to write at all.
 *
 * The cost is a vertical scroller per page, which is why the pager virtualises.
 */
function MonthPage({
  offset,
  width,
  settings,
  selected,
  onSelect,
  onOpenSubscription,
}: {
  offset: number;
  width: number;
  settings: CalendarSettings;
  selected: string | null;
  onSelect: (date: string) => void;
  onOpenSubscription: (subscriptionId: string) => void;
}) {
  const insets = useSafeAreaInsets();

  // Each page asks for its own month, keyed by month — so the pages either side
  // are already in cache by the time a swipe reaches them.
  const month = monthIso(offset);
  const calendar = useCalendarMonth(month);

  const cells = monthGrid(month, settings.weekStart);
  const days = new Map(
    (calendar.data?.days ?? []).map((day) => [day.date, day]),
  );

  return (
    <ScrollView
      style={{ width }}
      // "never", not "automatic": the fixed header above this pager already
      // clears the navigation bar, and an automatic inset here would push every
      // page down by it a second time.
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[
        styles.page,
        { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
      ]}
    >
      <MonthCells
        cells={cells}
        days={days}
        settings={settings}
        selected={selected}
        onSelect={onSelect}
      />

      <View style={styles.divider} />

      {calendar.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : calendar.isError ? (
        <Text style={styles.failed}>{m.common_loadFailed()}</Text>
      ) : (
        <Agenda days={calendar.data?.days ?? []} onOpen={onOpenSubscription} />
      )}
    </ScrollView>
  );
}

/**
 * The month, swipeable — grid, total and agenda together.
 *
 * `offset` is owned by the caller, because the arrows and Today move it too.
 * `settledRef` is what stops those two fighting the scroller: without it the
 * effect below would scroll back to an index the user has just swiped away
 * from, every time.
 */
export function MonthPager({
  offset,
  onOffsetChange,
  settings,
  selected,
  onSelect,
  onOpenSubscription,
}: {
  offset: number;
  onOffsetChange: (offset: number) => void;
  settings: CalendarSettings;
  selected: string | null;
  onSelect: (date: string) => void;
  onOpenSubscription: (subscriptionId: string) => void;
}) {
  // Full-bleed pages: each one carries its own horizontal padding, so the swipe
  // runs edge to edge the way a calendar's does rather than inside a gutter.
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<number>>(null);
  const settledRef = useRef(offset);

  useEffect(() => {
    if (settledRef.current === offset) return;
    settledRef.current = offset;
    list.current?.scrollToIndex({ index: offset + REACH, animated: true });
  }, [offset]);

  return (
    <FlatList
      ref={list}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      // Each page owns a vertical scroller that takes the safe-area inset.
      // Without this the horizontal one takes it too and starts every page
      // pushed down by the status bar's height.
      automaticallyAdjustContentInsets={false}
      data={OFFSETS}
      keyExtractor={(item) => String(item)}
      initialScrollIndex={REACH}
      // Constant-width pages, so the list never has to measure one to know
      // where the others are — which is what makes `initialScrollIndex` land
      // without a visible jump on mount.
      getItemLayout={(_, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      onMomentumScrollEnd={(event) => {
        const next =
          Math.round(event.nativeEvent.contentOffset.x / (width || 1)) - REACH;
        if (next === settledRef.current) return;
        settledRef.current = next;
        onOffsetChange(next);
      }}
      renderItem={({ item }) => (
        <MonthPage
          offset={item}
          width={width}
          settings={settings}
          selected={selected}
          onSelect={onSelect}
          onOpenSubscription={onOpenSubscription}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 12, paddingTop: 2, gap: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  failed: { fontSize: 14, color: colors.muted, textAlign: "center" },
});
