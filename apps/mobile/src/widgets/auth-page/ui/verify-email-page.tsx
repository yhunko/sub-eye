import { useSignUp } from "@clerk/clerk-expo";
import { Redirect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { colors } from "@/shared/ui/theme";
import { maskEmail } from "../model/mask-email";
import { AuthScaffold } from "./auth-scaffold";
import { ErrorBanner } from "./chrome";
import { authErrorMessage } from "./error-copy";
import { OtpInput } from "./otp-input";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export function VerifyEmailPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((left) => left - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Clerk holds the in-progress SignUp on its client, not in route params — so a
  // cold start or a process kill lands here with nothing to verify.
  if (isLoaded && !signUp.emailAddress) return <Redirect href="/sign-up" />;

  const verify = async () => {
    if (busy) return;
    if (!isLoaded) {
      setError(m.auth_errorNotReady());
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status !== "complete") {
        setError(m.auth_errorNeedsMoreSteps());
        return;
      }
      await setActive({ session: attempt.createdSessionId });
      router.replace("/");
    } catch (err) {
      setError(authErrorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    // The cooldown is silent on purpose — the button already shows the count.
    if (cooldown > 0) return;
    if (!isLoaded) {
      setError(m.auth_errorNotReady());
      return;
    }
    setError(null);
    setCooldown(RESEND_SECONDS);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <AuthScaffold
      back
      title={m.auth_verifyTitle()}
      subtitle={
        <>
          {m.auth_verifySubtitle()}{" "}
          <Text style={styles.address}>
            {maskEmail(signUp?.emailAddress ?? "")}
          </Text>
        </>
      }
      banner={
        error ? (
          <ErrorBanner title={m.auth_couldNotVerify()} body={error} />
        ) : null
      }
      footer={
        <View style={styles.note}>
          <SymbolView
            name={{ ios: "info.circle", android: "info" }}
            size={17}
            tintColor={colors.muted}
          />
          <Text style={styles.noteText}>{m.auth_verifyAutofillHint()}</Text>
        </View>
      }
    >
      <View style={styles.code}>
        <OtpInput value={code} onChangeText={setCode} />
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={cooldown > 0}
        onPress={() => void resend()}
        hitSlop={8}
      >
        <Text style={styles.resend}>
          {cooldown > 0
            ? m.auth_resendIn({
                seconds: `0:${String(cooldown).padStart(2, "0")}`,
              })
            : m.auth_resendNow()}
        </Text>
      </Pressable>

      <View style={styles.action}>
        <Button
          label={m.auth_verifyAction()}
          busy={busy}
          disabled={code.length < CODE_LENGTH}
          onPress={() => void verify()}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        // Pop when there is something to pop — replacing would leave a second
        // sign-up entry stacked under this one. The fallback names the
        // destination for the case where this screen is the stack root.
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/sign-up")
        }
        hitSlop={8}
      >
        <Text style={styles.different}>{m.auth_useDifferentEmail()}</Text>
      </Pressable>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  address: { color: colors.text },
  code: { marginBottom: 18 },
  resend: { textAlign: "center", fontSize: 13, color: colors.muted },
  action: { marginTop: 24, marginBottom: 14 },
  different: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
  note: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 17, color: colors.muted },
});
