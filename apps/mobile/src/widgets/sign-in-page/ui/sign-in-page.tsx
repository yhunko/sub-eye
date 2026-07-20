import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { m } from "@/shared/i18n";
import { colors } from "@/shared/ui/theme";

// Email + password sign-in. Deliberately minimal: this exists so the foundation
// can be verified end to end (a signed-in session is what makes the dashboard
// smoke query return 200 instead of 401).
export function SignInPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    // The sign-in modal is reached via the auth gate's <Redirect>, which replaces
    // rather than pushes — so router.back() can be a no-op. Fall back to replacing
    // the stack root, which the (now signed-in) gate resolves to the tabs.
    const enterApp = () => {
      if (router.canGoBack()) router.back();
      else router.replace("/");
    };
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        enterApp();
      } else {
        setError(m.auth_signInError());
      }
    } catch (err) {
      const first = (err as { errors?: { code?: string; message?: string }[] })
        .errors?.[0];
      // A prior attempt already established the session; just enter the app.
      if (first?.code === "session_exists") {
        enterApp();
        return;
      }
      setError(first?.message ?? m.auth_signInError());
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.title}>{m.auth_signInTitle()}</Text>
        <TextInput
          style={styles.input}
          placeholder={m.auth_email()}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder={m.auth_password()}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={styles.button}
          disabled={busy}
          onPress={() => void submit()}
        >
          <Text style={styles.buttonText}>{m.auth_signInAction()}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  form: { padding: 24, gap: 12 },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    padding: 14,
  },
  error: { color: colors.danger, fontSize: 14 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: { color: colors.bg, fontSize: 16, fontWeight: "700" },
});
