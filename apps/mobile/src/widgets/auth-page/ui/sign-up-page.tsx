import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { privacyUrl, termsUrl } from "@/shared/config/legal";
import { m } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { colors } from "@/shared/ui/theme";
import { AuthInput } from "./auth-input";
import { AuthScaffold } from "./auth-scaffold";
import { ErrorBanner, FooterLink, OrDivider } from "./chrome";
import { authErrorMessage } from "./error-copy";
import { PasswordInput } from "./password-input";
import { SsoHandoff, SsoRow, useSso } from "./sso";

export function SignUpPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sso = useSso(setError);

  const submit = async () => {
    if (!isLoaded || busy) return;
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
        unsafeMetadata: { termsAcceptedAt: new Date().toISOString() },
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

  const canSubmit =
    consented && username.trim().length > 0 && password.length > 0;

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

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consented }}
            onPress={() => setConsented((current) => !current)}
            style={styles.consent}
          >
            <View style={[styles.box, consented ? styles.boxOn : null]}>
              {consented ? (
                <SymbolView
                  name={{ ios: "checkmark", android: "check" }}
                  size={13}
                  tintColor={colors.bg}
                />
              ) : null}
            </View>
            {/* Split into separate keys rather than one sentence with markers:
                each linked phrase has to inflect per locale (uk needs the
                instrumental "Умовами користування"), which no interpolation
                into a shared noun could produce. */}
            <Text style={styles.consentText}>
              {m.auth_consentBefore()}
              <Text
                style={styles.consentLink}
                onPress={() => void Linking.openURL(termsUrl())}
              >
                {m.auth_consentLink()}
              </Text>
              {m.auth_consentAnd()}
              <Text
                style={styles.consentLink}
                onPress={() => void Linking.openURL(privacyUrl())}
              >
                {m.auth_consentPrivacyLink()}
              </Text>
              {m.auth_consentAfter()}
            </Text>
          </Pressable>

          <Button
            label={m.auth_createAccount()}
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
  form: { gap: 14 },
  optional: { fontSize: 12, color: colors.muted },
  consent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    // The row IS the tap target for the checkbox — 44pt, not the 22pt box.
    minHeight: 44,
  },
  box: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  consentText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.muted },
  consentLink: { fontWeight: "600", color: colors.text },
});
