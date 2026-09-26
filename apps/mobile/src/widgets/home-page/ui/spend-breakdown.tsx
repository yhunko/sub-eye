import { SymbolView } from "expo-symbols";
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { colors } from "@/shared/ui/theme";
import { useLargeText } from "@/shared/ui/use-large-text";

/**
 * One slice of the month's spend, already named and coloured by the caller.
 *
 * Deliberately not `CategorySpendingDto`: the same card answers "where does it
 * go" at whatever resolution the install has. A free user has no categories, so
 * the grouping that means something to them is the subscriptions themselves —
 * and this component has no business knowing which of the two it is drawing.
 */
export type SpendRow = {
  key: string;
  name: string;
  amount: number;
  color: string;
};

/**
 * Rows shown before the rest fold into one.
 *
 * Four is what fits under the bar without the card becoming the page. Past that
 * the shares are slivers the bar cannot draw and the rows are a list, which is
 * what the Subscriptions tab is for — but they are one tap away rather than
 * summed into an "everything else" the user cannot open.
 */
const VISIBLE = 4;

// Open, the card simply grows and the page scrolls through it. An inner
// scroller was tried and reverted: a UIScrollView claims the vertical drag
// whether or not its content overflows, so over a short list it swallowed every
// swipe across the card and left the rows the fold had just revealed stranded
// under the tab bar.

/** Long enough to read as the card opening, short enough not to be waited on. */
const OPEN_MS = 220;

/**
 * The tail of the list, opening and closing on its OWN measured height.
 *
 * Not `entering`/`exiting` on the rows, and not a `LinearTransition` on the card
 * around them: neither animates the box those rows live in. Measured on device —
 * stretched to eight seconds to be sure — the card's height snapped to its new
 * size on the first frame while the removed rows went on fading in place
 * outside it, which is the jumble the fold looked like.
 *
 * So the rows are never unmounted. They sit in a clipped box whose height is
 * animated straight from 0 to what they measure, which is the one thing here
 * that does drive layout, and the card follows because its child is really that
 * tall. `onLayout` fires on the inner view, which keeps its full height at every
 * Dynamic Type setting, so nothing is hardcoded.
 */
function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const [height, setHeight] = useState(0);

  const box = useAnimatedStyle(() => ({
    height: withTiming(open ? height : 0, { duration: OPEN_MS }),
    opacity: withTiming(open ? 1 : 0, { duration: OPEN_MS }),
  }));

  return (
    <Animated.View
      style={[styles.collapsible, box]}
      // Closed, the rows are still mounted — so they have to be taken out of
      // the accessibility tree by hand, or VoiceOver reads a list the screen is
      // not showing.
      pointerEvents={open ? "auto" : "none"}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
    >
      <View
        style={styles.collapsibleInner}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </Animated.View>
  );
}

function Row({
  item,
  share,
  amount,
  ruled,
  stacked,
}: {
  item: SpendRow;
  share: number;
  amount: string;
  ruled: boolean;
  stacked: boolean;
}) {
  return (
    <View
      style={[styles.row, ruled && styles.ruled]}
      // Three fragments on screen are one fact in speech. Ungrouped, VoiceOver
      // hands the name, the share and the amount over as three separate swipes.
      accessible
      accessibilityLabel={[item.name, `${share.toFixed(1)}%`, amount].join(
        ", ",
      )}
    >
      <View style={styles.line}>
        <View style={[styles.dot, { backgroundColor: item.color }]} />
        <Text style={styles.name}>{item.name}</Text>
        {stacked ? null : <Figures share={share} amount={amount} />}
      </View>
      {stacked ? (
        <View style={styles.figuresLine}>
          <Figures share={share} amount={amount} />
        </View>
      ) : null}
    </View>
  );
}

function Figures({ share, amount }: { share: number; amount: string }) {
  return (
    <>
      <Text style={styles.share}>{share.toFixed(1)}%</Text>
      <Text style={styles.amount}>{amount}</Text>
    </>
  );
}

// One segmented bar, not a bar per row: seven slices where one is 80% is
// unreadable as a pie, and seven separate tracks drew the same fact seven times
// while making the card twice as tall. The bar carries the shape of the month,
// each row carries its own name, share and amount on the line the eye is on.
export function SpendBreakdown({
  currency,
  rows,
  count,
  more,
}: {
  currency: string;
  rows: SpendRow[];
  /**
   * "7 categories" / "7 subscriptions", and "3 more …" — message-function
   * REFERENCES, invoked at render. The card is the same either way; only the
   * noun changes, and only the caller knows which entitlement it is drawing.
   */
  count: (inputs: { count: number }) => string;
  more: (inputs: { count: number }) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  // The two figures drop below the name at the accessibility text sizes — three
  // things across a phone is already tight at 15pt and impossible at 53.
  const stacked = useLargeText();

  const total = rows.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0) return null;

  const head = rows.slice(0, VISIBLE);
  const tail = rows.slice(VISIBLE);
  const tailTotal = tail.reduce((sum, item) => sum + item.amount, 0);
  const foldable = tail.length > 0;

  return (
    <View>
      <View style={[styles.head, stacked && styles.headStacked]}>
        <Text style={styles.title}>{m.home_whereItGoes()}</Text>
        <Text style={styles.count}>{count({ count: rows.length })}</Text>
      </View>

      <View style={styles.card}>
        {/* The FOLDED set, whichever way the rows are showing — the bar is the
            shape of the month, and it must not change when the list opens.
            Drawn over twenty-one segments it was a row of 3pt dashes, and the
            one thing a share bar has to do is be readable at a glance.
            The tail keeps its width rather than being dropped: without it the
            segments sum to less than the month and every share above them is
            quietly overstated. */}
        <View
          style={styles.bar}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {rows.slice(0, VISIBLE).map((item) => (
            <View
              key={item.key}
              // A 0.4% slice still gets a visible stub — an invisible segment
              // reads as a rendering bug, not as "this one is tiny".
              style={[
                styles.segment,
                {
                  flexGrow: Math.max(item.amount / total, 0.02),
                  backgroundColor: item.color,
                },
              ]}
            />
          ))}
          {tailTotal > 0 ? (
            <View
              style={[
                styles.segment,
                { flexGrow: tailTotal / total, backgroundColor: colors.muted },
              ]}
            />
          ) : null}
        </View>

        {head.map((item, index) => (
          <Row
            key={item.key}
            item={item}
            share={(item.amount / total) * 100}
            amount={formatMoney(item.amount, currency)}
            ruled={foldable || index < head.length - 1}
            stacked={stacked}
          />
        ))}

        {foldable ? (
          <Collapsible open={expanded}>
            {tail.map((item) => (
              <Row
                key={item.key}
                item={item}
                share={(item.amount / total) * 100}
                amount={formatMoney(item.amount, currency)}
                // Always ruled: the toggle row always follows the tail.
                ruled
                stacked={stacked}
              />
            ))}
          </Collapsible>
        ) : null}

        {foldable ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((open) => !open)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.line}>
              <View style={[styles.dot, { backgroundColor: colors.muted }]} />
              <Text style={styles.name}>
                {expanded
                  ? m.home_breakdownLess()
                  : more({ count: tail.length })}
              </Text>
              {expanded || stacked ? null : (
                <Text style={styles.amount}>
                  {formatMoney(tailTotal, currency)}
                </Text>
              )}
              <SymbolView
                name={
                  expanded
                    ? { ios: "chevron.up", android: "keyboard_arrow_up" }
                    : { ios: "chevron.down", android: "keyboard_arrow_down" }
                }
                size={13}
                weight="semibold"
                tintColor={colors.muted}
              />
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  // The count drops UNDER the title at the accessibility text sizes. Across a
  // row the title is the one that gives — it is the `flexShrink` — and at 53pt
  // "Where it goes" was shrinking to a column one letter wide with the count
  // still whole beside it. Same fix, and the same shape, as the subscriptions
  // list's section headings.
  headStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
  },
  // `lineHeight` on both is NOT styling — see `month-hero`'s `label`. Unset,
  // iOS under-measures a 12.5pt frame at the accessibility text sizes and clips
  // the top of the line.
  title: {
    flexShrink: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  count: { fontSize: 12.5, lineHeight: 17, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  bar: { flexDirection: "row", gap: 3, height: 10, marginBottom: 6 },
  // `flexGrow` rather than a percentage width, so the 3pt gaps come out of the
  // segments instead of pushing the last one past the card's edge.
  segment: { flexBasis: 0, borderRadius: 999 },
  // The clip is what turns an animated height into a fold: the rows keep their
  // full size and the box uncovers them.
  collapsible: { overflow: "hidden" },
  // Measured, so it must never be the thing being animated — it reports the
  // tail's natural height while the box around it moves.
  collapsibleInner: { position: "absolute", left: 0, right: 0, top: 0 },
  row: { paddingVertical: 11, paddingHorizontal: 2 },
  ruled: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  line: { flexDirection: "row", alignItems: "center", gap: 10 },
  // The figures' own line, once they no longer fit on the name's. Indented past
  // the dot so the row still reads as one thing.
  figuresLine: {
    flexDirection: "row",
    alignItems: "baseline",
    // The amount takes a line of its own before it breaks in half: "₴4,237." /
    // "09" is a number a spend tracker has no business printing.
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 2,
    marginTop: 4,
    marginLeft: 19,
  },
  dot: { width: 9, height: 9, borderRadius: 999 },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  share: { fontSize: 12.5, color: colors.muted },
  amount: {
    // A FLOOR, not a width: right-aligned it keeps the amounts in a column at
    // the default size, and it still grows past 78 when the text does.
    minWidth: 78,
    flexShrink: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
});
