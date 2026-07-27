/**
 * `yhunko@gmail.com` → `y****o@gmail.com`. Enough for the user to recognise the
 * address they just typed without printing it in full on a screen someone may be
 * reading over their shoulder.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at);

  if (local.length <= 2) return `${local[0]}*${domain}`;
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}${domain}`;
}
