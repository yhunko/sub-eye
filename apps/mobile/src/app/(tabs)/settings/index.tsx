import { useAuth } from "@clerk/clerk-expo";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

// Placeholder — Plan 6 replaces this body with <SettingsPage/>. Sign-out lives
// here already because Task 14 verifies the full sign-in → sign-out round trip.
export default function SettingsRoute() {
  const { signOut, isSignedIn } = useAuth();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      {isSignedIn ? (
        <Pressable style={styles.button} onPress={() => void signOut()}>
          <Text style={styles.buttonText}>{m.settings_signOut()}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24 },
  button: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
});
