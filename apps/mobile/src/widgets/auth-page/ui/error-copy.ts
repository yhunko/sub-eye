import { m } from "@/shared/i18n";
import { clerkErrorCode, clerkErrorText } from "../model/clerk-error";

// Message-function REFERENCES, invoked at call time. Calling m.foo() here would
// freeze the string in whichever locale was active when this module first loaded.
const COPY: Record<string, () => string> = {
  form_identifier_not_found: () => m.auth_errorNoAccount(),
  form_password_incorrect: () => m.auth_errorWrongPassword(),
  form_identifier_exists: () => m.auth_errorIdentifierTaken(),
  form_code_incorrect: () => m.auth_errorCodeIncorrect(),
  verification_failed: () => m.auth_errorCodeIncorrect(),
  verification_expired: () => m.auth_errorCodeExpired(),
  too_many_requests: () => m.auth_errorTooManyRequests(),
};

/**
 * Translate the codes worth translating, and fall through to Clerk's own copy
 * for the rest — its `longMessage` for a password-policy rejection is more
 * specific than anything a generic fallback could say.
 */
export function authErrorMessage(err: unknown): string {
  const code = clerkErrorCode(err);
  const known = code ? COPY[code] : undefined;
  return known?.() ?? clerkErrorText(err) ?? m.auth_errorGeneric();
}
