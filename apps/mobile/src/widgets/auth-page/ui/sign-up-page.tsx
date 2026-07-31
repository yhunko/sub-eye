import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { colors } from "@/shared/ui/theme";
import { termsConsent } from "../model/consent";
import { AppleSignInButton, useAppleSignIn } from "./apple-sign-in";
import { AuthInput } from "./auth-input";
import { AuthScaffold } from "./auth-scaffold";
import { ConsentNotice, ErrorBanner, FooterLink, OrDivider } from "./chrome";
import { authErrorMessage } from "./error-copy";
import { PasswordInput } from "./password-input";
import { SsoHandoff, SsoRow, useSso } from "./sso";

export function SignUpPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sso = useSso(setError);
  const apple = useAppleSignIn(setError);

  const submit = async () => {
    if (busy) return;
    if (!isLoaded) {
      setError(m.auth_errorNotReady());
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const trimmedEmail = email.trim();
      const attempt = await signUp.create({
        username: username.trim(),
        // Omit the key entirely rather than sending "" — Clerk validates an
        // empty string as a malformed address instead of as "not provided".
        ...(trimmedEmail ? { emailAddress: trimmedEmail } : {}),
        password,
        unsafeMetadata: termsConsent(),
      });

      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
        return;
      }

      // With an email on the account Clerk wants it verified before the session
      // exists. The SignUp resource lives on the Clerk client, so the code screen
      // picks it back up from useSignUp() — nothing needs passing through params.
      //
      // Guarded on the address: a username-only sign-up that still comes back
      // incomplete is missing something else entirely, and asking Clerk to email
      // a code to nobody fails with a message about the wrong problem.
      if (!trimmedEmail) {
        setError(m.auth_errorNeedsMoreSteps());
        return;
      }
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      router.push("/verify-email");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = username.trim().length > 0 && password.length > 0;

  return (
    <>
      <AuthScaffold
        // No back chip: this is an entry point, not a page under sign-in. The
        // footer link is the way across, and the brand mark opens both screens
        // the same way so neither reads as the "real" one.
        brand
        title={m.auth_signUpTitle()}
        subtitle={m.auth_signUpSubtitle()}
        banner={
          error ? (
            <ErrorBanner title={m.auth_couldNotSignUp()} body={error} />
          ) : null
        }
        footer={
          <FooterLink
            prompt={m.auth_haveAccount()}
            action={m.auth_signInTitle()}
            href="/sign-in"
          />
        }
      >
        <View style={styles.form}>
          <AuthInput
            label={m.auth_username()}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username-new"
            textContentType="username"
            returnKeyType="next"
          />
          <AuthInput
            label={m.auth_email()}
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="next"
            accessory={<Text style={styles.optional}>{m.auth_optional()}</Text>}
            hint={m.auth_emailHint()}
          />
          <PasswordInput
            meter
            label={m.auth_password()}
            value={password}
            onChangeText={setPassword}
            autoComplete="password-new"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />

          <Button
            label={m.auth_createAccount()}
            busy={busy}
            disabled={!canSubmit}
            onPress={() => void submit()}
          />
        </View>

        <OrDivider />
        <AppleSignInButton
          intent="signUp"
          onPress={apple.start}
          disabled={busy || apple.pending || sso.pending !== null}
        />
        <SsoRow onStart={sso.start} disabled={busy || apple.pending} />
        <ConsentNotice />
      </AuthScaffold>

      {sso.pending ? (
        <SsoHandoff provider={sso.pending} onCancel={sso.cancel} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  optional: { fontSize: 12, color: colors.muted },
});
