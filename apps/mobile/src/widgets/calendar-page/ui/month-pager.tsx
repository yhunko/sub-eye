import type { CalendarDayDto } from "@subeye/model";
import { SymbolView } from "expo-symbols";
import {
  memo,
  type RefObject,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCalendarMonth } from "@/entities/calendar";
import { usePro } from "@/entities/pro";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";
import {
  isHeavyDay,
  monthDelta,
  monthGrid,
  monthIso,
  monthNameLabel,
  siblingMonth,
} from "../model/month";
import type { CalendarSettings } from "../model/settings";
import { Agenda } from "./agenda";
import { MonthCells, WeekdayHeader } from "./month-grid";

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

/** What the caller drives the pager WITH. There is no state to set. */
export type MonthPagerHandle = { goTo: (offset: number) => void };

const ARROW = {
  up: { ios: "arrow.up", android: "arrow_upward" },
  down: { ios: "arrow.down", android: "arrow_downward" },
} as const;

/**
 * The month's own total, over its grid.
 *
 * Inside the page rather than pinned above it, which is what stopped it lagging:
 * fixed, it could only be redrawn once the swipe had ENDED — the header quoted
 * one month while the grid under it showed another, for the whole gesture. It
 * travels with the month it describes now, so there is no moment where the two
 * disagree and no animation to write.
 *
 * The delta is Pro. Nothing marks its absence: a free calendar is a whole
 * calendar, and a lock card here would be a nag on the one screen a user opens
 * every day.
 *
 * The chip is Home's, down to the tokens and the two strings, because it is the
 * same claim about the same kind of number — the second place in this app where
 * a brand-green amount is allowed, and for the same reason: this is a DIRECTION,
 * not a balance, and a month that costs less is unambiguously the good outcome.
 * Two chips that agreed by coincidence would drift the first time either moved.
 *
 * "vs November" sits OUTSIDE the chip, in muted text. Inside, it stretches the
 * capsule across half the row and puts the colour on a month name, which is not
 * the thing that went up.
 */
function MonthTotal({
  total,
  previousTotal,
  month,
  currencyCode,
  isPro,
}: {
  total: number;
  previousTotal: number;
  month: string;
  currencyCode: string;
  isPro: boolean;
}) {
  const stacked = useLargeText();
  const delta = isPro ? monthDelta(total, previousTotal) : null;
  const previousMonth = new Date(month);
  previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);

  return (
    <View style={[styles.totalRow, stacked && styles.totalRowStacked]}>
      <View style={styles.totalLabels}>
        <Text style={styles.totalLabel}>{m.calendar_monthTotal()}</Text>
        {delta ? (
          <View style={styles.deltaRow}>
            <View
              style={[
                styles.chip,
                stacked && styles.chipStacked,
                delta.up ? styles.chipUp : styles.chipDown,
              ]}
            >
              <SymbolView
                name={delta.up ? ARROW.up : ARROW.down}
                size={10}
                weight="bold"
                tintColor={delta.up ? colors.danger : colors.accent}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: delta.up ? colors.danger : colors.accent },
                ]}
              >
                {(delta.up ? m.home_deltaMore : m.home_deltaLess)({
                  amount: formatMoney(delta.amount, currencyCode, {
                    decimals: 0,
                  }),
                })}
              </Text>
            </View>
            <Text style={styles.vs}>
              {m.calendar_vsMonth({
                month: monthNameLabel(previousMonth.toISOString()),
              })}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.totalAmount}>{formatMoney(total, currencyCode)}</Text>
    </View>
  );
}

/**
 * ONE month: its total, its grid and its agenda, in a scroller of its own.
 *
 * Everything that belongs to a month lives in here rather than above the pager,
 * and that is the whole point of this file's shape. Above it, a fixed block can
 * only be redrawn when the gesture ends — the grid paged between two months
 * while the total and the week-start row over it said something else, and the
 * row clipped the last tiles of whatever scrolled under it. Inside, the next
 * month's figures arrive with the next month's grid because they are the same
 * surface.
 *
 * The cost is a vertical scroller per page, which is why the pager virtualises
 * down to the neighbours.
 */
const MonthPage = memo(function MonthPage({
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
  const isPro = usePro();

  // Each page asks for its own month, keyed by month — so the pages either side
  // are already in cache by the time a swipe reaches them.
  const month = monthIso(offset);
  const calendar = useCalendarMonth(month);

  // The grid's first and last rows show the neighbouring months' days, and a
  // day shown blank is a day the user reads as "nothing due". Both are cache
  // hits in practice: the pages either side of this one have already asked for
  // exactly these two months under the same keys.
  const before = useCalendarMonth(siblingMonth(month, -1));
  const after = useCalendarMonth(siblingMonth(month, 1));

  const cells = useMemo(
    () => monthGrid(month, settings.weekStart),
    [month, settings.weekStart],
  );

  const monthDays = calendar.data?.days;
  const monthTotal = calendar.data?.monthTotal ?? 0;

  const days = useMemo(() => {
    const byDate = new Map<string, CalendarDayDto>();
    for (const day of before.data?.days ?? []) byDate.set(day.date, day);
    for (const day of after.data?.days ?? []) byDate.set(day.date, day);
    for (const day of monthDays ?? []) byDate.set(day.date, day);
    return byDate;
  }, [before.data?.days, after.data?.days, monthDays]);

  // Computed once for the whole month rather than per tile, and only for the
  // entitlement that renders it — 42 tiles asking the same question 42 times is
  // the shape that makes a grid feel heavy under a finger.
  //
  // THIS month's days only. The flag is a share of a month total, so testing a
  // neighbour's day against this month's total is a different question with a
  // plausible-looking answer.
  const heavyDates = useMemo(() => {
    if (!isPro || !monthDays) return null;
    const heavy = new Set<string>();
    for (const day of monthDays) {
      if (isHeavyDay(day, monthTotal)) heavy.add(day.date);
    }
    return heavy.size ? heavy : null;
  }, [isPro, monthDays, monthTotal]);

  return (
    <ScrollView
      style={{ width }}
      // "never", not "automatic": the fixed controls above this pager already
      // clear the navigation bar, and an automatic inset here would push every
      // page down by it a second time.
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[
        styles.page,
        { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
      ]}
    >
      <MonthTotal
        total={monthTotal}
        previousTotal={calendar.data?.previousMonthTotal ?? 0}
        month={month}
        currencyCode={calendar.data?.currencyCode ?? ""}
        isPro={isPro}
      />

      <WeekdayHeader weekStart={settings.weekStart} />

      <MonthCells
        cells={cells}
        days={days}
        heavyDates={heavyDates}
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
        <Agenda
          days={monthDays ?? []}
          monthTotal={monthTotal}
          onOpen={onOpenSubscription}
        />
      )}
    </ScrollView>
  );
});

/**
 * The month, swipeable — total, grid and agenda together.
 *
 * THE SCROLL POSITION IS THE ONLY SOURCE OF TRUTH for which month is showing.
 * `offset` used to be React state that the arrows wrote and the scroller wrote
 * back, and the two drifted: a scroll that settled without the state hearing
 * about it left the navigation title naming one month over another month's
 * grid — and `Today` could not repair it, because it compared its target
 * against the state that was already wrong and returned early. The caller now
 * only ever RECEIVES an offset from here, and moves the pager through `controls`
 * so a move is a scroll rather than a state change that may or may not become
 * one.
 *
 * `live` is the one guard: a settle is trusted once the user has touched the
 * list, so a layout-time scroll event at the origin can never be mistaken for a
 * jump two years back.
 */
export function MonthPager({
  controls,
  onOffsetChange,
  settings,
  selected,
  onSelect,
  onOpenSubscription,
}: {
  controls: RefObject<MonthPagerHandle | null>;
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
  const visible = useRef(0);
  const live = useRef(false);

  const settle = (next: number) => {
    if (next === visible.current) return;
    visible.current = next;
    onOffsetChange(next);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!live.current) return;
    settle(
      Math.round(event.nativeEvent.contentOffset.x / (width || 1)) - REACH,
    );
  };

  useImperativeHandle(controls, () => ({
    goTo: (next: number) => {
      const target = Math.max(-REACH, Math.min(REACH, next));
      // NOT animated, and not because animation is expensive. A one-page slide
      // reports every fractional position it passes through, so the title flips
      // to the month being left and back again mid-flight; suppressing that
      // needs a flag whose only reliable clear is an event that does not fire
      // when the scroll had nowhere to go. Landing is also simply faster.
      list.current?.scrollToIndex({ index: target + REACH, animated: false });
      settle(target);
    },
  }));

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
      keyExtractor={keyOf}
      initialScrollIndex={REACH}
      // Constant-width pages, so the list never has to measure one to know
      // where the others are — which is what makes `initialScrollIndex` land
      // without a visible jump on mount.
      getItemLayout={(_, index) => ({
        length: width,
        offset: width * index,
        index,
      })}
      // A month page is a 42-tile grid, an agenda and a projection query. The
      // default window is TEN viewports either side, which quietly mounted up to
      // twenty-one of them — the comment above about the neighbours was simply
      // not true until this was set.
      windowSize={3}
      initialNumToRender={1}
      maxToRenderPerBatch={1}
      removeClippedSubviews
      onScrollBeginDrag={() => {
        live.current = true;
      }}
      scrollEventThrottle={16}
      onScroll={onScroll}
      // Belt to the brace above: `onScroll` is throttled and the last frame of a
      // page settling can arrive before it has finished settling.
      onMomentumScrollEnd={onScroll}
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

const keyOf = (item: number) => String(item);

const styles = StyleSheet.create({
  page: { paddingHorizontal: 12, paddingTop: 4, gap: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  failed: { fontSize: 14, color: colors.muted, textAlign: "center" },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 4,
  },
  // The figure cannot sit beside a wrapped chip at accessibility sizes, and
  // shrinking either into an ellipsis is the failure Dynamic Type is about.
  totalRowStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
  },
  totalLabels: { flexShrink: 1, minWidth: 0, gap: 4 },
  totalLabel: {
    fontSize: 12.5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.muted,
  },
  // Wraps rather than truncates: "vs September" after a five-figure delta does
  // not fit on a 320pt screen, and a clipped month name is worse than a line.
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 6,
    rowGap: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  // Two lines of chip is a box, not a capsule — see Home's, which this is.
  chipStacked: { borderRadius: 14, alignItems: "flex-start" },
  chipUp: { backgroundColor: colors.dangerSoft },
  chipDown: { backgroundColor: colors.accentSoft },
  chipText: { fontSize: 12.5, fontWeight: "700" },
  vs: { flexShrink: 1, fontSize: 12.5, color: colors.muted },
  totalAmount: {
    flexShrink: 0,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
});
