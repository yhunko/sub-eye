import { useEffect, useRef } from "react";
import { type FlatList, useWindowDimensions, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, { useAnimatedScrollHandler } from "react-native-reanimated";
import { useCalendarMonth } from "@/entities/calendar";
import { monthGrid, monthIso } from "../model/month";
import type { CalendarSettings } from "../model/settings";
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

/** The calendar page's own horizontal padding, which each page fills inside. */
const PAGE_PADDING = 12;

const OFFSETS = Array.from({ length: PAGES }, (_, index) => index - REACH);

function MonthPage({
  offset,
  width,
  settings,
  selected,
  onSelect,
}: {
  offset: number;
  width: number;
  settings: CalendarSettings;
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  // Each page asks for its own month. Keyed by month, so the two pages either
  // side are already in cache by the time a swipe reaches them — and the page
  // the screen is showing shares its entry with the agenda below, which asks
  // for the same key.
  const month = monthIso(offset);
  const { data } = useCalendarMonth(month);

  const cells = monthGrid(month, settings.weekStart);
  const days = new Map((data?.days ?? []).map((day) => [day.date, day]));

  return (
    <View style={{ width }}>
      <MonthCells
        cells={cells}
        days={days}
        settings={settings}
        selected={selected}
        onSelect={onSelect}
      />
    </View>
  );
}

/**
 * The month grid, swipeable.
 *
 * The pages are the GRID only — the title, the month total and the agenda are
 * outside it and flip when the swipe settles. Paging the whole screen instead
 * would need a vertical scroller per page, and the agenda is the one part that
 * has to scroll independently of the gesture.
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
  pageShift,
}: {
  offset: number;
  onOffsetChange: (offset: number) => void;
  settings: CalendarSettings;
  selected: string | null;
  onSelect: (date: string) => void;
  /**
   * How far this pager sits from a settled page, signed, in pages: 0 when
   * settled, ±0.5 at the half-way point. The agenda reads it to move WITH the
   * grid instead of after it — which is the whole complaint about the version
   * that animated once the swipe had already stopped.
   */
  pageShift: SharedValue<number>;
}) {
  const { width } = useWindowDimensions();
  const pageWidth = width - PAGE_PADDING * 2;
  const list = useRef<FlatList<number>>(null);
  const settledRef = useRef(offset);

  // On the UI thread, so the agenda tracks the finger frame for frame. It also
  // means there is no timing curve at all: nothing to interrupt, nothing to
  // leave half-finished, and the arrows drive it too because `scrollToIndex`
  // emits the same events.
  //
  // Signed and relative to the NEAREST page, so it crosses zero exactly at the
  // half-way point — which is where the agenda is dimmest and where its
  // contents are swapped.
  const onScroll = useAnimatedScrollHandler((event) => {
    const page = event.contentOffset.x / (pageWidth || 1);
    pageShift.value = page - Math.round(page);
  });

  useEffect(() => {
    if (settledRef.current === offset) return;
    settledRef.current = offset;
    list.current?.scrollToIndex({ index: offset + REACH, animated: true });
  }, [offset]);

  return (
    <Animated.FlatList
      ref={list}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      // The page's vertical scroll view takes UIKit's automatic safe-area
      // inset. Without this the nested horizontal one takes it too and starts
      // the grid pushed down by the status bar's height.
      automaticallyAdjustContentInsets={false}
      data={OFFSETS}
      keyExtractor={(item) => String(item)}
      initialScrollIndex={REACH}
      // Constant-width pages, so the list never has to measure one to know
      // where the others are — which is what makes `initialScrollIndex` land
      // without a visible jump on mount.
      getItemLayout={(_, index) => ({
        length: pageWidth,
        offset: pageWidth * index,
        index,
      })}
      onScroll={onScroll}
      onMomentumScrollEnd={(event) => {
        const next =
          Math.round(event.nativeEvent.contentOffset.x / (pageWidth || 1)) -
          REACH;
        if (next === settledRef.current) return;
        settledRef.current = next;
        onOffsetChange(next);
      }}
      renderItem={({ item }: { item: number }) => (
        <MonthPage
          offset={item}
          width={pageWidth}
          settings={settings}
          selected={selected}
          onSelect={onSelect}
        />
      )}
    />
  );
}
