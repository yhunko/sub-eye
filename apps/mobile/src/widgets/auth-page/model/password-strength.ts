/** 0 = too short to score, 1 = weak, 2 = good, 3 = strong. */
export type PasswordStrength = 0 | 1 | 2 | 3;

const MIN_LENGTH = 8;

/**
 * Advisory only — Clerk enforces the real policy server-side and rejects the
 * create call. This exists so the meter moves while typing, not to gate submit.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length < MIN_LENGTH) return 0;

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((pattern) =>
    pattern.test(password),
  ).length;

  const long = password.length >= 12;
  const varied = classes >= 3;

  if (long && varied) return 3;
  if (long || varied) return 2;
  return 1;
}
