import type { AndroidSymbol, SFSymbol } from "expo-symbols";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

/**
 * The shell every unprompted sheet the app shows is built from: a glyph, a
 * headline, a sentence, whatever the sheet is actually FOR, and the actions.
 *
 * In `shared/ui` for the same reason `list-row` is: two different widgets
 * present one of these — the Pro pitch and the reminders offer — and a widget
 * reaching into another widget's `ui/` is a cross-import `check:boundaries`
 * fails the build on.
 *
 * Both are presented as `compactSheet` — a `formSheet` that sizes to its own
 * contents. Two rules follow from that and breaking either is silent:
 *
 * - NOTHING here may have a zero flex basis. The detent is computed from this
 *   subtree, so `flex: 1` anywhere above the scroller measures the whole sheet
 *   to nothing. `flexShrink` is what lets the body take its natural height and
 *   still give height back when the content outgrows the screen.
 * - The bottom padding is small on purpose. A fitted sheet already pays for the
 *   home indicator itself; paying again leaves a band of empty card under the
 *   last button, which is what the first version did.
 */
export function PromptSheet({
  icon,
  title,
  body,
  children,
  actions,
}: {
  icon: { ios: SFSymbol; android: AndroidSymbol };
  title: string;
  body: string;
  /** What the sheet is for — a list, a set of rows, anything with a height. */
  children?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <View style={styles.sheet}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <SymbolView name={icon} size={30} tintColor={colors.accent} />

        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{body}</Text>
        </View>

        {children}
      </ScrollView>

      <View style={styles.actions}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 26, paddingTop: 26, paddingBottom: 14, gap: 20 },
  body: { flexShrink: 1 },
  bodyContent: { gap: 20 },
  copy: { gap: 10 },
  title: { fontSize: 26, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 17, lineHeight: 24, color: colors.muted },
  actions: { gap: 6 },
});
