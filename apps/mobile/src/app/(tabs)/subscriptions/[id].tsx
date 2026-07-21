import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useCachedSubscriptionRow } from "@/entities/subscription";
import { colors } from "@/shared/ui/theme";

// Placeholder — Plan 7 replaces this with the real detail screen (pricing
// timeline, allowedActions, lifecycle mutations). It exists now so tapping a list
// row navigates somewhere real instead of hitting a missing route, and it already
// demonstrates the cache seeding: the name paints instantly from the list cache.
export default function SubscriptionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cached = useCachedSubscriptionRow(id);

  return (
    <>
      <Stack.Screen options={{ title: cached?.name ?? "" }} />
      <View style={styles.content}>
        <Text style={styles.text}>{cached?.name ?? ""}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  text: { color: colors.muted, fontSize: 16 },
});
