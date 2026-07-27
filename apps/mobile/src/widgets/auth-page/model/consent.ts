/**
 * Stamped onto every path that can create an account — credentials, SSO, Apple.
 * Clerk's SSO and Apple hooks forward `unsafeMetadata` to `signUp.create` ONLY
 * when the verification comes back `transferable`, so passing it from the
 * sign-in screen too is free: an existing user's original timestamp is not
 * overwritten.
 */
export const termsConsent = () => ({
  termsAcceptedAt: new Date().toISOString(),
});
