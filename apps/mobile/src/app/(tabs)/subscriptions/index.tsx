import { ScrollView, StyleSheet, Text } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

// Placeholder — Plan 6 replaces this body with <SubscriptionsPage/>.
export default function SubscriptionsRoute() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Text style={styles.text}>{m.subscriptions_title()}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24 },
  text: { color: colors.muted, fontSize: 16 },
});
