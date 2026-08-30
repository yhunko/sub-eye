import type { CalendarEventDto, CalendarEventKind } from "@subeye/model";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { formatMoney } from "@/shared/lib/format";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { eventIcon } from "@/shared/ui/event-icon";
import { colors } from "@/shared/ui/theme";

// Message-function REFERENCES, invoked at render. Calling m.*() at module scope
// freezes the string in whichever locale was active at import.
//
// Bare of a date, unlike Home's rail: every row here already sits under a
// heading that names the day, and repeating "in 2 days" on each line of a card
// whose title says "in 2 days" is noise the eye has to skip.
const KIND_LABEL: Record<CalendarEventKind, () => string> = {
  trialEnds: m.calendar_kindTrialEnds,
  introEnds: m.calendar_kindIntroEnds,
  priceChange: m.calendar_kindPriceChange,
  payment: m.calendar_kindPayment,
  resumes: m.calendar_kindResumes,
  ends: m.calendar_kindEnds,
};

/**
 * One dated event, inside a day's card or the day sheet.
 *
 * The two kinds that are not charges are marked rather than labelled twice: a
 * resume is accent green because a forgotten pause is an unplanned charge, and
 * an ending has its amount struck through because printed plainly it reads as
 * money on the way rather than money that stops. Both follow Home's rail.
 */
export function EventRow({
  event,
  onPress,
}: {
  event: CalendarEventDto;
  onPress: () => void;
}) {
  const stopping = event.kind === "ends";
  const resuming = event.kind === "resumes";
  const amount = formatMoney(event.amount, event.currencyCode);
  const label = KIND_LABEL[event.kind]();

  return (
    <Pressable
      accessibilityRole="button"
      // A strikethrough is invisible to VoiceOver, which would read the amount
      // as a plain charge — the exact misreading the strike prevents.
      accessibilityLabel={`${event.name}, ${label}, ${
        stopping ? m.home_attnStops({ amount }) : amount
      }`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <BrandLogo
        name={event.name}
        brandDomain={event.brandDomain}
        size={36}
        dimmed={stopping}
      />
      <View style={styles.text}>
        <Text style={styles.name}>{event.name}</Text>
        {/* Glyph and label carry the SAME tint here, unlike Home's rail where
            colour is spent on how soon the event lands. This screen answers
            "when" with the heading above the row, so the only thing left for
            colour to say is which two kinds are not charges. */}
        <View style={styles.whenRow}>
          <SymbolView
            name={eventIcon[event.kind]}
            size={12}
            weight="semibold"
            tintColor={resuming ? colors.accent : colors.muted}
          />
          <Text style={[styles.when, resuming && styles.whenResuming]}>
            {label}
          </Text>
        </View>
      </View>
      <Text style={[styles.amount, stopping && styles.amountStopped]}>
        {amount}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  pressed: { opacity: 0.65 },
  text: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  whenRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  when: { flexShrink: 1, fontSize: 12.5, color: colors.muted },
  whenResuming: { color: colors.accent, fontWeight: "600" },
  amount: {
    flexShrink: 0,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  // Muted, not green: this is not a discount. The green belongs to the resume
  // line, which is the only thing here a user has to act on.
  amountStopped: { color: colors.muted, textDecorationLine: "line-through" },
});
