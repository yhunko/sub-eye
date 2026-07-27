import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { colors } from "@/shared/ui/theme";
import { clerkErrorCode } from "../model/clerk-error";
import { AuthInput } from "./auth-input";
import { AuthScaffold } from "./auth-scaffold";
import { ErrorBanner, FooterLink, OrDivider } from "./chrome";
import { authErrorMessage } from "./error-copy";
import { PasswordInput } from "./password-input";
import { SsoHandoff, SsoRow, useSso } from "./sso";

export function SignInPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sso = useSso(setError);

  const submit = async () => {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError(null);
    try {
      const attempt = await signIn.create({ identifier, password });
      if (attempt.status !== "complete") {
        // Anything else needs a factor this app does not collect (2FA, a backup
        // code). Say so plainly rather than leaving the button spinning.
        setError(m.auth_errorNeedsMoreSteps());
        return;
      }
      await setActive({ session: attempt.createdSessionId });
      router.replace("/");
    } catch (err) {
      // A prior attempt already established the session; just enter the app.
      if (clerkErrorCode(err) === "session_exists") {
        router.replace("/");
        return;
      }
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = identifier.trim().length > 0 && password.length > 0;

  return (
    <>
      <AuthScaffold
        brand
        title={m.auth_signInTitle()}
        subtitle={m.auth_signInSubtitle()}
        banner={
          error ? (
            <ErrorBanner title={m.auth_couldNotSignIn()} body={error} />
          ) : null
        }
        footer={
          <FooterLink
            prompt={m.auth_newHere()}
            action={m.auth_createAccountLink()}
            href="/sign-up"
          />
        }
      >
        <View style={styles.form}>
          <AuthInput
            label={m.auth_identifier()}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="you@email.com"
            autoCapitalize="none"
            autoComplete="username"
            textContentType="username"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <PasswordInput
            label={m.auth_password()}
            value={password}
            onChangeText={setPassword}
            placeholder={m.auth_password()}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            accessory={
              <Link href="/reset-password" style={styles.forgot}>
                {m.auth_forgot()}
              </Link>
            }
          />
          <Button
            label={m.auth_continue()}
            busy={busy}
            disabled={!canSubmit}
            onPress={() => void submit()}
          />
        </View>

        <OrDivider />
        <SsoRow onStart={sso.start} disabled={busy} />
      </AuthScaffold>

      {sso.pending ? (
        <SsoHandoff provider={sso.pending} onCancel={sso.cancel} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  forgot: { fontSize: 13, fontWeight: "600", color: colors.accent },
});
