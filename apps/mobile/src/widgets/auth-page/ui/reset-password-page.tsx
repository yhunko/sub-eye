import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { colors } from "@/shared/ui/theme";
import { maskEmail } from "../model/mask-email";
import { AuthInput } from "./auth-input";
import { AuthScaffold } from "./auth-scaffold";
import { ErrorBanner, FooterLink, NoteCard } from "./chrome";
import { authErrorMessage } from "./error-copy";
import { OtpInput } from "./otp-input";
import { PasswordInput } from "./password-input";

const CODE_LENGTH = 6;

/**
 * Screens 04 and 05, plus the code step between them that the design leaves
 * implicit: Clerk's reset is create → attemptFirstFactor(code) → resetPassword,
 * and its own `signIn.status` drives which one is on screen.
 */
export function ResetPasswordPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Each step re-checks isLoaded rather than relying on `run`: useSignIn returns
  // a discriminated union, and TypeScript only narrows `signIn` in the scope
  // where the check happens — not across the callback boundary.
  const sendCode = () =>
    run(async () => {
      if (!isLoaded) {
        setError(m.auth_errorNotReady());
        return;
      }
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setStep("code");
    });

  const submitCode = () =>
    run(async () => {
      if (!isLoaded) {
        setError(m.auth_errorNotReady());
        return;
      }
      await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
      });
      setStep("password");
    });

  const savePassword = () =>
    run(async () => {
      if (!isLoaded) {
        setError(m.auth_errorNotReady());
        return;
      }
      const attempt = await signIn.resetPassword({
        password,
        // The subtitle promises this, so it has to actually happen: a password
        // reset that leaves a stolen session alive has reset nothing.
        signOutOfOtherSessions: true,
      });
      if (attempt.status !== "complete") {
        setError(m.auth_errorNeedsMoreSteps());
        return;
      }
      await setActive({ session: attempt.createdSessionId });
      router.replace("/");
    });

  const mismatch = repeat.length > 0 && repeat !== password;
  const banner = error ? (
    <ErrorBanner title={m.auth_couldNotReset()} body={error} />
  ) : null;
  const backToSignIn = (
    <FooterLink action={m.auth_backToSignIn()} href="/sign-in" />
  );

  if (step === "email") {
    return (
      <AuthScaffold
        back
        title={m.auth_resetTitle()}
        subtitle={m.auth_resetSubtitle()}
        banner={banner}
        footer={backToSignIn}
      >
        <View style={styles.form}>
          <AuthInput
            label={m.auth_email()}
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="go"
            autoFocus
            onSubmitEditing={sendCode}
          />
          <Button
            label={m.auth_sendCode()}
            busy={busy}
            disabled={email.trim().length === 0}
            onPress={sendCode}
          />
        </View>
        <View style={styles.note}>
          <NoteCard title={m.auth_noEmailTitle()} body={m.auth_noEmailBody()} />
        </View>
      </AuthScaffold>
    );
  }

  if (step === "code") {
    return (
      <AuthScaffold
        back
        onBack={() => setStep("email")}
        title={m.auth_verifyTitle()}
        subtitle={
          <>
            {m.auth_verifySubtitle()}{" "}
            <Text style={styles.address}>{maskEmail(email.trim())}</Text>
          </>
        }
        banner={banner}
        footer={backToSignIn}
      >
        <OtpInput value={code} onChangeText={setCode} />
        <View style={styles.action}>
          <Button
            label={m.auth_continue()}
            busy={busy}
            disabled={code.length < CODE_LENGTH}
            onPress={submitCode}
          />
        </View>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      back
      onBack={() => setStep("code")}
      title={m.auth_newPasswordTitle()}
      subtitle={m.auth_newPasswordSubtitle()}
      banner={banner}
    >
      <View style={styles.form}>
        <PasswordInput
          meter
          autoFocus
          label={m.auth_newPassword()}
          value={password}
          onChangeText={setPassword}
          autoComplete="password-new"
          textContentType="newPassword"
        />
        <PasswordInput
          label={m.auth_repeatPassword()}
          value={repeat}
          onChangeText={setRepeat}
          autoComplete="password-new"
          textContentType="newPassword"
          error={mismatch ? m.auth_errorPasswordMismatch() : undefined}
          returnKeyType="go"
          onSubmitEditing={savePassword}
        />
        <Button
          label={m.auth_saveAndSignIn()}
          busy={busy}
          disabled={password.length === 0 || mismatch || repeat.length === 0}
          onPress={savePassword}
        />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  note: { marginTop: 24 },
  action: { marginTop: 24 },
  address: { color: colors.text },
});
